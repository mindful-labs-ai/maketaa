/**
 * Zustand Store for Card Editor State Management
 * Manages card_spec state, auto-save, edit logging
 *
 * State automatically syncs to Supabase on changes with 1-second debounce
 */

import { create } from 'zustand';
import { debounce } from '../lib/utils';
import { recordEdit, updateCardSpec } from '../lib/api';
import { isAuthenticated } from '../lib/supabase';
import type {
  CardSpec,
  Card,
  CardStyle,
  CardText,
  SnsConfig,
  AutoSaveStatus,
  EditorMode,
  CardSpecStatus,
} from '@/types';
import type { CanvasRatio } from '@/lib/constants';

// ============================================================================
// Store State Interface
// ============================================================================

interface CardStoreState {
  // Data
  cardSpec: CardSpec | null;
  selectedCardIndex: number;
  unsavedChanges: boolean;
  autoSaveStatus: AutoSaveStatus;
  lastError: string | null;
  editCount: number; // Number of edits in current session

  // UI State
  editorMode: EditorMode;
  isLoading: boolean;
  canvasRatio: CanvasRatio;

  // Actions
  loadSpec: (spec: CardSpec) => void;
  selectCard: (index: number) => void;
  setCanvasRatio: (ratio: CanvasRatio) => Promise<void>;
  updateCardText: (
    cardIndex: number,
    field: Exclude<keyof CardText, 'bullet_points'>,
    value: string
  ) => Promise<void>;
  setCardTextField: (
    cardIndex: number,
    field: Exclude<keyof CardText, 'bullet_points'>,
    value: string | undefined
  ) => Promise<void>;
  updateBulletPoint: (cardIndex: number, pointIndex: number, value: string) => Promise<void>;
  addBulletPoint: (cardIndex: number) => Promise<void>;
  removeBulletPoint: (cardIndex: number, pointIndex: number) => Promise<void>;
  updateCardStyle: (
    cardIndex: number,
    styleUpdates: Partial<CardStyle>
  ) => Promise<void>;
  updateCardBackground: (
    cardIndex: number,
    backgroundUpdates: any
  ) => Promise<void>;
  reorderCards: (fromIndex: number, toIndex: number) => Promise<void>;
  updateSnsCaption: (
    platform: 'instagram' | 'threads',
    content: string
  ) => Promise<void>;
  setStatus: (status: CardSpecStatus) => Promise<void>;
  setEditorMode: (mode: EditorMode) => void;
  reset: () => void;

  // Internal
  markUnsaved: () => void;
  setAutoSaveStatus: (status: AutoSaveStatus) => void;
  setLastError: (error: string | null) => void;
  setIsLoading: (loading: boolean) => void;
}

// ============================================================================
// Store Creation
// ============================================================================

const initialState = {
  cardSpec: null,
  selectedCardIndex: 0,
  unsavedChanges: false,
  autoSaveStatus: 'idle' as AutoSaveStatus,
  lastError: null,
  editCount: 0,
  editorMode: 'view' as EditorMode,
  isLoading: false,
  canvasRatio: '1:1' as CanvasRatio,
};

export const useCardStore = create<CardStoreState>((set, get) => {
  // =========================================================================
  // Auto-save Handler (debounced)
  // =========================================================================

  // Helper: only call Supabase write operations when authenticated
  const tryRecordEdit = async (...args: Parameters<typeof recordEdit>) => {
    const authed = await isAuthenticated();
    if (!authed) return; // Skip edit logging in unauthenticated MVP mode
    return recordEdit(...args);
  };

  const performAutoSave = debounce(async () => {
    const { cardSpec } = get();
    if (!cardSpec) return;

    // Skip auto-save if not authenticated (MVP mode)
    const authed = await isAuthenticated();
    if (!authed) {
      set({ autoSaveStatus: 'idle' });
      return;
    }

    try {
      set({ autoSaveStatus: 'saving' });
      await updateCardSpec(cardSpec.meta.id, cardSpec);
      set({ autoSaveStatus: 'saved', unsavedChanges: false });

      // Reset "saved" status after 2 seconds
      setTimeout(() => {
        set((state) =>
          state.autoSaveStatus === 'saved' ? { autoSaveStatus: 'idle' } : state
        );
      }, 2000);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Save failed';
      set({ autoSaveStatus: 'error', lastError: message });
      console.error('[CardEditor] Auto-save error:', error);
    }
  }, 1000); // 1-second debounce

  return {
    ...initialState,

    // =====================================================================
    // Load & Initialization
    // =====================================================================

    loadSpec: (spec: CardSpec) => {
      set({
        cardSpec: spec,
        selectedCardIndex: 0,
        unsavedChanges: false,
        editCount: 0,
        autoSaveStatus: 'idle',
        lastError: null,
        canvasRatio: (spec.canvas_ratio as CanvasRatio) || '1:1',
      });
    },

    selectCard: (index: number) => {
      const { cardSpec } = get();
      if (cardSpec && index >= 0 && index < cardSpec.cards.length) {
        set({ selectedCardIndex: index });
      }
    },

    setCanvasRatio: async (ratio: CanvasRatio) => {
      const { cardSpec } = get();
      set({ canvasRatio: ratio, unsavedChanges: true });

      if (cardSpec) {
        const updatedSpec = { ...cardSpec, canvas_ratio: ratio };
        set({ cardSpec: updatedSpec });
        performAutoSave();
      }
    },

    // =====================================================================
    // Card Text Editing
    // =====================================================================

    updateCardText: async (
      cardIndex: number,
      field: Exclude<keyof CardText, 'bullet_points'>,
      value: string
    ) => {
      const { cardSpec } = get();
      if (!cardSpec || cardIndex >= cardSpec.cards.length) {
        throw new Error('Invalid card index');
      }

      const card = cardSpec.cards[cardIndex];
      const oldValue = card.text[field] || '';
      const fieldPath = `cards[${cardIndex}].text.${field}`;

      // Update local state (immutable) — always succeeds synchronously
      const updatedCards = cardSpec.cards.map((c, i) =>
        i === cardIndex
          ? { ...c, text: { ...c.text, [field]: value } }
          : c
      );

      set((state) => ({
        cardSpec: state.cardSpec
          ? { ...state.cardSpec, cards: updatedCards }
          : null,
        unsavedChanges: true,
        editCount: state.editCount + 1,
      }));

      // Record edit log & auto-save (non-blocking — skipped if unauthenticated)
      tryRecordEdit(cardSpec.meta.id, fieldPath, oldValue, value).catch((err) =>
        console.warn('[CardEditor] Edit log failed (non-blocking):', err)
      );
      performAutoSave();
    },

    setCardTextField: async (
      cardIndex: number,
      field: Exclude<keyof CardText, 'bullet_points'>,
      value: string | undefined
    ) => {
      const { cardSpec } = get();
      if (!cardSpec || cardIndex >= cardSpec.cards.length) {
        throw new Error('Invalid card index');
      }

      const card = cardSpec.cards[cardIndex];
      const oldValue = card.text[field] ?? '';

      const updatedText = { ...card.text };
      if (value === undefined) {
        delete updatedText[field];
      } else {
        updatedText[field] = value;
      }

      const updatedCards = cardSpec.cards.map((c, i) =>
        i === cardIndex ? { ...c, text: updatedText } : c
      );

      set((state) => ({
        cardSpec: state.cardSpec
          ? { ...state.cardSpec, cards: updatedCards }
          : null,
        unsavedChanges: true,
        editCount: state.editCount + 1,
      }));

      tryRecordEdit(
        cardSpec.meta.id,
        `cards[${cardIndex}].text.${field}`,
        String(oldValue),
        value === undefined ? '' : value,
        value === undefined ? 'Field removed' : 'Field added'
      ).catch((err) =>
        console.warn('[CardEditor] Edit log failed (non-blocking):', err)
      );
      performAutoSave();
    },

    // =====================================================================
    // Bullet Points Editing
    // =====================================================================

    updateBulletPoint: async (cardIndex: number, pointIndex: number, value: string) => {
      const { cardSpec } = get();
      if (!cardSpec || cardIndex >= cardSpec.cards.length) {
        throw new Error('Invalid card index');
      }

      const card = cardSpec.cards[cardIndex];
      const points = card.text.bullet_points ? [...card.text.bullet_points] : [];
      const oldValue = points[pointIndex] ?? '';
      points[pointIndex] = value;

      const updatedCards = cardSpec.cards.map((c, i) =>
        i === cardIndex
          ? { ...c, text: { ...c.text, bullet_points: points } }
          : c
      );

      set((state) => ({
        cardSpec: state.cardSpec ? { ...state.cardSpec, cards: updatedCards } : null,
        unsavedChanges: true,
        editCount: state.editCount + 1,
      }));

      tryRecordEdit(
        cardSpec.meta.id,
        `cards[${cardIndex}].text.bullet_points[${pointIndex}]`,
        oldValue,
        value
      ).catch((err) => console.warn('[CardEditor] Edit log failed (non-blocking):', err));
      performAutoSave();
    },

    addBulletPoint: async (cardIndex: number) => {
      const { cardSpec } = get();
      if (!cardSpec || cardIndex >= cardSpec.cards.length) {
        throw new Error('Invalid card index');
      }

      const card = cardSpec.cards[cardIndex];
      const points = card.text.bullet_points ? [...card.text.bullet_points, ''] : [''];

      const updatedCards = cardSpec.cards.map((c, i) =>
        i === cardIndex
          ? { ...c, text: { ...c.text, bullet_points: points } }
          : c
      );

      set((state) => ({
        cardSpec: state.cardSpec ? { ...state.cardSpec, cards: updatedCards } : null,
        unsavedChanges: true,
        editCount: state.editCount + 1,
      }));

      performAutoSave();
    },

    removeBulletPoint: async (cardIndex: number, pointIndex: number) => {
      const { cardSpec } = get();
      if (!cardSpec || cardIndex >= cardSpec.cards.length) {
        throw new Error('Invalid card index');
      }

      const card = cardSpec.cards[cardIndex];
      const points = (card.text.bullet_points ?? []).filter((_, i) => i !== pointIndex);

      const updatedCards = cardSpec.cards.map((c, i) =>
        i === cardIndex
          ? { ...c, text: { ...c.text, bullet_points: points } }
          : c
      );

      set((state) => ({
        cardSpec: state.cardSpec ? { ...state.cardSpec, cards: updatedCards } : null,
        unsavedChanges: true,
        editCount: state.editCount + 1,
      }));

      tryRecordEdit(
        cardSpec.meta.id,
        `cards[${cardIndex}].text.bullet_points`,
        JSON.stringify(card.text.bullet_points ?? []),
        JSON.stringify(points),
        'Bullet point removed'
      ).catch((err) => console.warn('[CardEditor] Edit log failed (non-blocking):', err));
      performAutoSave();
    },

    // =====================================================================
    // Card Style Editing
    // =====================================================================

    updateCardStyle: async (
      cardIndex: number,
      styleUpdates: Partial<CardStyle>
    ) => {
      const { cardSpec } = get();
      if (!cardSpec || cardIndex >= cardSpec.cards.length) {
        throw new Error('Invalid card index');
      }

      const card = cardSpec.cards[cardIndex];
      const oldStyle = JSON.stringify(card.style);

      // Update local state (immutable)
      const updatedCards = cardSpec.cards.map((c, i) =>
        i === cardIndex
          ? { ...c, style: { ...c.style, ...styleUpdates } }
          : c
      );
      const newStyle = JSON.stringify(updatedCards[cardIndex].style);

      set((state) => ({
        cardSpec: state.cardSpec
          ? { ...state.cardSpec, cards: updatedCards }
          : null,
        unsavedChanges: true,
        editCount: state.editCount + 1,
      }));

      // Record edit log & auto-save (non-blocking)
      tryRecordEdit(
        cardSpec.meta.id,
        `cards[${cardIndex}].style`,
        oldStyle,
        newStyle,
        'Style updated'
      ).catch((err) =>
        console.warn('[CardEditor] Edit log failed (non-blocking):', err)
      );
      performAutoSave();
    },

    // =====================================================================
    // Card Background Editing
    // =====================================================================

    updateCardBackground: async (
      cardIndex: number,
      backgroundUpdates: any
    ) => {
      const { cardSpec } = get();
      if (!cardSpec || cardIndex >= cardSpec.cards.length) {
        throw new Error('Invalid card index');
      }

      const card = cardSpec.cards[cardIndex];
      const oldBackground = JSON.stringify(card.background);

      // Update local state (immutable)
      const updatedCards = cardSpec.cards.map((c, i) =>
        i === cardIndex
          ? { ...c, background: { ...c.background, ...backgroundUpdates } }
          : c
      );
      const newBackground = JSON.stringify(updatedCards[cardIndex].background);

      set((state) => ({
        cardSpec: state.cardSpec
          ? { ...state.cardSpec, cards: updatedCards }
          : null,
        unsavedChanges: true,
        editCount: state.editCount + 1,
      }));

      // Record edit log & auto-save (non-blocking)
      tryRecordEdit(
        cardSpec.meta.id,
        `cards[${cardIndex}].background`,
        oldBackground,
        newBackground,
        'Background updated'
      ).catch((err) =>
        console.warn('[CardEditor] Edit log failed (non-blocking):', err)
      );
      performAutoSave();
    },

    // =====================================================================
    // Card Reordering
    // =====================================================================

    reorderCards: async (fromIndex: number, toIndex: number) => {
      const { cardSpec } = get();
      if (!cardSpec) return;

      try {
        // Reorder local array
        const reordered = [...cardSpec.cards];
        const [removed] = reordered.splice(fromIndex, 1);
        reordered.splice(toIndex, 0, removed);

        // Update indexes (immutable)
        const reorderedWithIndex = reordered.map((card, idx) => ({
          ...card,
          index: idx + 1,
        }));

        set((state) => ({
          cardSpec: state.cardSpec
            ? { ...state.cardSpec, cards: reorderedWithIndex }
            : null,
          unsavedChanges: true,
          editCount: state.editCount + 1,
        }));

        // Record edit log & auto-save (non-blocking)
        tryRecordEdit(
          cardSpec.meta.id,
          'cards.order',
          `[${fromIndex}]`,
          `[${toIndex}]`,
          'Card order changed'
        ).catch((err) =>
          console.warn('[CardEditor] Edit log failed (non-blocking):', err)
        );
        performAutoSave();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Reorder failed';
        set({ lastError: message });
      }
    },

    // =====================================================================
    // SNS Caption Editing
    // =====================================================================

    updateSnsCaption: async (
      platform: 'instagram' | 'threads',
      content: string
    ) => {
      const { cardSpec } = get();
      if (!cardSpec) return;

      const oldCaption = cardSpec.sns[platform]
        ? JSON.stringify(cardSpec.sns[platform])
        : null;

      // Build updated sns (immutable)
      const updatedSns = { ...cardSpec.sns };
      if (platform === 'instagram') {
        updatedSns.instagram = {
          ...cardSpec.sns.instagram,
          caption: content,
          hashtags: cardSpec.sns.instagram?.hashtags || [],
        };
      } else if (platform === 'threads') {
        updatedSns.threads = {
          text: content,
        };
      }

      const newCaption = JSON.stringify(updatedSns[platform]);

      set((state) => ({
        cardSpec: state.cardSpec
          ? { ...state.cardSpec, sns: updatedSns }
          : null,
        unsavedChanges: true,
        editCount: state.editCount + 1,
      }));

      // Record edit log & auto-save (non-blocking)
      tryRecordEdit(
        cardSpec.meta.id,
        `sns.${platform}`,
        oldCaption,
        newCaption,
        'SNS caption updated'
      ).catch((err) =>
        console.warn('[CardEditor] Edit log failed (non-blocking):', err)
      );
      performAutoSave();
    },

    // =====================================================================
    // Status Updates
    // =====================================================================

    setStatus: async (status: CardSpecStatus) => {
      const { cardSpec } = get();
      if (!cardSpec) return;

      const oldStatus = cardSpec.meta.status;
      // Update meta (immutable)
      const updatedMeta = { ...cardSpec.meta, status };

      set((state) => ({
        cardSpec: state.cardSpec
          ? { ...state.cardSpec, meta: updatedMeta }
          : null,
        unsavedChanges: true,
        editCount: state.editCount + 1,
      }));

      // Record edit log (non-blocking)
      tryRecordEdit(
        cardSpec.meta.id,
        'meta.status',
        oldStatus,
        status,
        'Status changed'
      ).catch((err) =>
        console.warn('[CardEditor] Edit log failed (non-blocking):', err)
      );

      // Save immediately (don't debounce status changes) — skip if unauthenticated
      const authed = await isAuthenticated();
      if (authed) {
        try {
          set({ autoSaveStatus: 'saving' });
          const latestSpec = get().cardSpec;
          if (latestSpec) {
            await updateCardSpec(cardSpec.meta.id, latestSpec);
          }
          set({ autoSaveStatus: 'saved', unsavedChanges: false });

          setTimeout(() => {
            set((state) =>
              state.autoSaveStatus === 'saved' ? { autoSaveStatus: 'idle' } : state
            );
          }, 2000);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Status update failed';
          set({ autoSaveStatus: 'error', lastError: message });
        }
      }
    },

    // =====================================================================
    // UI State
    // =====================================================================

    setEditorMode: (mode: EditorMode) => {
      set({ editorMode: mode });
    },

    markUnsaved: () => {
      set({ unsavedChanges: true });
    },

    setAutoSaveStatus: (status: AutoSaveStatus) => {
      set({ autoSaveStatus: status });
    },

    setLastError: (error: string | null) => {
      set({ lastError: error });
    },

    setIsLoading: (loading: boolean) => {
      set({ isLoading: loading });
    },

    // =====================================================================
    // Reset
    // =====================================================================

    reset: () => {
      set(initialState);
    },
  };
});

// ============================================================================
// Selectors (for performance optimization)
// ============================================================================

export const useSelectedCard = () => {
  return useCardStore((state) => {
    if (!state.cardSpec || state.selectedCardIndex >= state.cardSpec.cards.length) {
      return null;
    }
    return state.cardSpec.cards[state.selectedCardIndex];
  });
};

export const useCardSpecMeta = () => {
  return useCardStore((state) => state.cardSpec?.meta || null);
};

export const useAllCards = () => {
  return useCardStore((state) => state.cardSpec?.cards || []);
};

export const useAutoSaveStatus = () => {
  return useCardStore((state) => ({
    status: state.autoSaveStatus,
    error: state.lastError,
  }));
};

export const useEditCount = () => {
  return useCardStore((state) => state.editCount);
};
