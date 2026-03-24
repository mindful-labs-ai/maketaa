/**
 * Zustand Store for Card Editor State Management
 * Manages card_spec state, auto-save, edit logging
 *
 * State automatically syncs to Supabase on changes with 1-second debounce
 */

import { create } from 'zustand';
import { debounce } from '../lib/utils';
import { recordEdit, updateCardSpec } from '../lib/api';
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

  // Actions
  loadSpec: (spec: CardSpec) => void;
  selectCard: (index: number) => void;
  updateCardText: (
    cardIndex: number,
    field: keyof CardText,
    value: string
  ) => Promise<void>;
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
};

export const useCardStore = create<CardStoreState>((set, get) => {
  // =========================================================================
  // Auto-save Handler (debounced)
  // =========================================================================

  const performAutoSave = debounce(async () => {
    const { cardSpec } = get();
    if (!cardSpec) return;

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
      });
    },

    selectCard: (index: number) => {
      const { cardSpec } = get();
      if (cardSpec && index >= 0 && index < cardSpec.cards.length) {
        set({ selectedCardIndex: index });
      }
    },

    // =====================================================================
    // Card Text Editing
    // =====================================================================

    updateCardText: async (
      cardIndex: number,
      field: keyof CardText,
      value: string
    ) => {
      const { cardSpec } = get();
      if (!cardSpec || cardIndex >= cardSpec.cards.length) {
        throw new Error('Invalid card index');
      }

      const card = cardSpec.cards[cardIndex];
      const oldValue = card.text[field] || '';
      const fieldPath = `cards[${cardIndex}].text.${field}`;

      try {
        // Update local state
        card.text = {
          ...card.text,
          [field]: value,
        };

        set((state) => ({
          cardSpec: state.cardSpec,
          unsavedChanges: true,
          editCount: state.editCount + 1,
        }));

        // Record edit log
        await recordEdit(cardSpec.meta.id, fieldPath, oldValue, value);

        // Trigger auto-save
        performAutoSave();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Update failed';
        set({ lastError: message });
        throw error;
      }
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

      try {
        card.style = {
          ...card.style,
          ...styleUpdates,
        };

        const newStyle = JSON.stringify(card.style);

        set((state) => ({
          cardSpec: state.cardSpec,
          unsavedChanges: true,
          editCount: state.editCount + 1,
        }));

        // Record edit log
        await recordEdit(
          cardSpec.meta.id,
          `cards[${cardIndex}].style`,
          oldStyle,
          newStyle,
          'Style updated'
        );

        // Trigger auto-save
        performAutoSave();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Update failed';
        set({ lastError: message });
        throw error;
      }
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

      try {
        card.background = {
          ...card.background,
          ...backgroundUpdates,
        };

        const newBackground = JSON.stringify(card.background);

        set((state) => ({
          cardSpec: state.cardSpec,
          unsavedChanges: true,
          editCount: state.editCount + 1,
        }));

        // Record edit log
        await recordEdit(
          cardSpec.meta.id,
          `cards[${cardIndex}].background`,
          oldBackground,
          newBackground,
          'Background updated'
        );

        // Trigger auto-save
        performAutoSave();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Update failed';
        set({ lastError: message });
        throw error;
      }
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

        // Update indexes
        reordered.forEach((card, idx) => {
          card.index = idx + 1;
        });

        set((state) => {
          if (state.cardSpec) {
            state.cardSpec.cards = reordered;
          }
          return {
            cardSpec: state.cardSpec,
            unsavedChanges: true,
            editCount: state.editCount + 1,
          };
        });

        // Record edit log
        await recordEdit(
          cardSpec.meta.id,
          'cards.order',
          `[${fromIndex}]`,
          `[${toIndex}]`,
          'Card order changed'
        );

        // Trigger auto-save
        performAutoSave();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Reorder failed';
        set({ lastError: message });
        throw error;
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

      try {
        const oldCaption = cardSpec.sns[platform]
          ? JSON.stringify(cardSpec.sns[platform])
          : null;

        if (platform === 'instagram') {
          cardSpec.sns.instagram = {
            ...cardSpec.sns.instagram,
            caption: content,
            hashtags: cardSpec.sns.instagram?.hashtags || [],
          };
        } else if (platform === 'threads') {
          cardSpec.sns.threads = {
            text: content,
          };
        }

        const newCaption = JSON.stringify(cardSpec.sns[platform]);

        set((state) => ({
          cardSpec: state.cardSpec,
          unsavedChanges: true,
          editCount: state.editCount + 1,
        }));

        // Record edit log
        await recordEdit(
          cardSpec.meta.id,
          `sns.${platform}`,
          oldCaption,
          newCaption,
          'SNS caption updated'
        );

        // Trigger auto-save
        performAutoSave();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Update failed';
        set({ lastError: message });
        throw error;
      }
    },

    // =====================================================================
    // Status Updates
    // =====================================================================

    setStatus: async (status: CardSpecStatus) => {
      const { cardSpec } = get();
      if (!cardSpec) return;

      try {
        const oldStatus = cardSpec.meta.status;
        cardSpec.meta.status = status;

        set((state) => ({
          cardSpec: state.cardSpec,
          unsavedChanges: true,
          editCount: state.editCount + 1,
        }));

        // Record edit log
        await recordEdit(
          cardSpec.meta.id,
          'meta.status',
          oldStatus,
          status,
          'Status changed'
        );

        // Save immediately (don't debounce status changes)
        set({ autoSaveStatus: 'saving' });
        await updateCardSpec(cardSpec.meta.id, cardSpec);
        set({ autoSaveStatus: 'saved', unsavedChanges: false });

        setTimeout(() => {
          set((state) =>
            state.autoSaveStatus === 'saved' ? { autoSaveStatus: 'idle' } : state
          );
        }, 2000);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Status update failed';
        set({ autoSaveStatus: 'error', lastError: message });
        throw error;
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
