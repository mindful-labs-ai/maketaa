/**
 * Zustand Store for Card Editor State Management
 * Ported from canvas_editor - uses Supabase auto-save with debounce
 */

import { create } from 'zustand';
import { debounce } from '@/lib/card-news/utils';
import { recordEdit, updateCardSpec, isAuthenticated } from '@/lib/card-news/api';
import type {
  Card,
  CardSpec,
  CardStyle,
  CardText,
  SnsConfig,
  AutoSaveStatus,
  EditorMode,
  CardSpecStatus,
  CardBackground,
} from '@/lib/card-news/types';
import type { CanvasRatio } from '@/lib/card-news/constants';

// ============================================================================
// Store State Interface
// ============================================================================

interface CardStoreState {
  cardSpec: CardSpec | null;
  selectedCardIndex: number;
  unsavedChanges: boolean;
  autoSaveStatus: AutoSaveStatus;
  lastError: string | null;
  editCount: number;
  editorMode: EditorMode;
  isLoading: boolean;
  canvasRatio: CanvasRatio;

  loadSpec: (spec: CardSpec) => void;
  selectCard: (index: number) => void;
  setCanvasRatio: (ratio: CanvasRatio) => Promise<void>;
  updateCardText: (
    cardIndex: number,
    field: Exclude<keyof CardText, 'bullet_points'>,
    value: string,
  ) => Promise<void>;
  setCardTextField: (
    cardIndex: number,
    field: Exclude<keyof CardText, 'bullet_points'>,
    value: string | undefined,
  ) => Promise<void>;
  updateBulletPoint: (cardIndex: number, pointIndex: number, value: string) => Promise<void>;
  addBulletPoint: (cardIndex: number) => Promise<void>;
  removeBulletPoint: (cardIndex: number, pointIndex: number) => Promise<void>;
  updateCardStyle: (cardIndex: number, styleUpdates: Partial<CardStyle>) => Promise<void>;
  updateCardBackground: (cardIndex: number, backgroundUpdates: Partial<CardBackground>) => Promise<void>;
  reorderCards: (fromIndex: number, toIndex: number) => Promise<void>;
  updateSnsCaption: (platform: 'instagram' | 'threads', content: string) => Promise<void>;
  setStatus: (status: CardSpecStatus) => Promise<void>;
  setEditorMode: (mode: EditorMode) => void;
  reset: () => void;
  markUnsaved: () => void;
  setAutoSaveStatus: (status: AutoSaveStatus) => void;
  setLastError: (error: string | null) => void;
  setIsLoading: (loading: boolean) => void;
}

const initialState = {
  cardSpec: null as CardSpec | null,
  selectedCardIndex: 0,
  unsavedChanges: false,
  autoSaveStatus: 'idle' as AutoSaveStatus,
  lastError: null as string | null,
  editCount: 0,
  editorMode: 'view' as EditorMode,
  isLoading: false,
  canvasRatio: '1:1' as CanvasRatio,
};

export const useCardStore = create<CardStoreState>((set, get) => {
  const tryRecordEdit = async (...args: Parameters<typeof recordEdit>) => {
    const authed = await isAuthenticated();
    if (!authed) return;
    return recordEdit(...args);
  };

  const performAutoSave = debounce(async () => {
    const { cardSpec } = get();
    if (!cardSpec) return;

    const authed = await isAuthenticated();
    if (!authed) {
      set({ autoSaveStatus: 'idle' });
      return;
    }

    try {
      set({ autoSaveStatus: 'saving' });
      await updateCardSpec(cardSpec.meta.id, cardSpec);
      set({ autoSaveStatus: 'saved', unsavedChanges: false });

      setTimeout(() => {
        set((state) =>
          state.autoSaveStatus === 'saved' ? { autoSaveStatus: 'idle' } : state,
        );
      }, 2000);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Save failed';
      set({ autoSaveStatus: 'error', lastError: message });
    }
  }, 1000);

  return {
    ...initialState,

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
        set({ cardSpec: { ...cardSpec, canvas_ratio: ratio } });
        performAutoSave();
      }
    },

    updateCardText: async (cardIndex, field, value) => {
      const { cardSpec } = get();
      if (!cardSpec || cardIndex >= cardSpec.cards.length) return;

      const card = cardSpec.cards[cardIndex];
      const oldValue = card.text[field] || '';
      const fieldPath = `cards[${cardIndex}].text.${field}`;

      const updatedCards = cardSpec.cards.map((c, i) =>
        i === cardIndex ? { ...c, text: { ...c.text, [field]: value } } : c,
      );

      set((state) => ({
        cardSpec: state.cardSpec ? { ...state.cardSpec, cards: updatedCards } : null,
        unsavedChanges: true,
        editCount: state.editCount + 1,
      }));

      tryRecordEdit(cardSpec.meta.id, fieldPath, oldValue, value).catch(() => {});
      performAutoSave();
    },

    setCardTextField: async (cardIndex, field, value) => {
      const { cardSpec } = get();
      if (!cardSpec || cardIndex >= cardSpec.cards.length) return;

      const card = cardSpec.cards[cardIndex];
      const updatedText = { ...card.text };
      if (value === undefined) {
        delete updatedText[field];
      } else {
        updatedText[field] = value;
      }

      const updatedCards = cardSpec.cards.map((c, i) =>
        i === cardIndex ? { ...c, text: updatedText } : c,
      );

      set((state) => ({
        cardSpec: state.cardSpec ? { ...state.cardSpec, cards: updatedCards } : null,
        unsavedChanges: true,
        editCount: state.editCount + 1,
      }));

      performAutoSave();
    },

    updateBulletPoint: async (cardIndex, pointIndex, value) => {
      const { cardSpec } = get();
      if (!cardSpec || cardIndex >= cardSpec.cards.length) return;

      const points = [...(cardSpec.cards[cardIndex].text.bullet_points || [])];
      points[pointIndex] = value;

      const updatedCards = cardSpec.cards.map((c, i) =>
        i === cardIndex ? { ...c, text: { ...c.text, bullet_points: points } } : c,
      );

      set((state) => ({
        cardSpec: state.cardSpec ? { ...state.cardSpec, cards: updatedCards } : null,
        unsavedChanges: true,
        editCount: state.editCount + 1,
      }));
      performAutoSave();
    },

    addBulletPoint: async (cardIndex) => {
      const { cardSpec } = get();
      if (!cardSpec || cardIndex >= cardSpec.cards.length) return;

      const points = [...(cardSpec.cards[cardIndex].text.bullet_points || []), ''];
      const updatedCards = cardSpec.cards.map((c, i) =>
        i === cardIndex ? { ...c, text: { ...c.text, bullet_points: points } } : c,
      );

      set((state) => ({
        cardSpec: state.cardSpec ? { ...state.cardSpec, cards: updatedCards } : null,
        unsavedChanges: true,
        editCount: state.editCount + 1,
      }));
      performAutoSave();
    },

    removeBulletPoint: async (cardIndex, pointIndex) => {
      const { cardSpec } = get();
      if (!cardSpec || cardIndex >= cardSpec.cards.length) return;

      const points = (cardSpec.cards[cardIndex].text.bullet_points ?? []).filter(
        (_, i) => i !== pointIndex,
      );
      const updatedCards = cardSpec.cards.map((c, i) =>
        i === cardIndex ? { ...c, text: { ...c.text, bullet_points: points } } : c,
      );

      set((state) => ({
        cardSpec: state.cardSpec ? { ...state.cardSpec, cards: updatedCards } : null,
        unsavedChanges: true,
        editCount: state.editCount + 1,
      }));
      performAutoSave();
    },

    updateCardStyle: async (cardIndex, styleUpdates) => {
      const { cardSpec } = get();
      if (!cardSpec || cardIndex >= cardSpec.cards.length) return;

      const updatedCards = cardSpec.cards.map((c, i) =>
        i === cardIndex ? { ...c, style: { ...c.style, ...styleUpdates } } : c,
      );

      set((state) => ({
        cardSpec: state.cardSpec ? { ...state.cardSpec, cards: updatedCards } : null,
        unsavedChanges: true,
        editCount: state.editCount + 1,
      }));
      performAutoSave();
    },

    updateCardBackground: async (cardIndex, backgroundUpdates) => {
      const { cardSpec } = get();
      if (!cardSpec || cardIndex >= cardSpec.cards.length) return;

      const updatedCards = cardSpec.cards.map((c, i) =>
        i === cardIndex
          ? { ...c, background: { ...c.background, ...backgroundUpdates } }
          : c,
      );

      set((state) => ({
        cardSpec: state.cardSpec ? { ...state.cardSpec, cards: updatedCards } : null,
        unsavedChanges: true,
        editCount: state.editCount + 1,
      }));
      performAutoSave();
    },

    reorderCards: async (fromIndex, toIndex) => {
      const { cardSpec } = get();
      if (!cardSpec) return;

      const reordered = [...cardSpec.cards];
      const [removed] = reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, removed);
      const reorderedWithIndex = reordered.map((card, idx) => ({ ...card, index: idx + 1 }));

      set((state) => ({
        cardSpec: state.cardSpec ? { ...state.cardSpec, cards: reorderedWithIndex } : null,
        unsavedChanges: true,
        editCount: state.editCount + 1,
      }));
      performAutoSave();
    },

    updateSnsCaption: async (platform, content) => {
      const { cardSpec } = get();
      if (!cardSpec) return;

      const updatedSns: SnsConfig = { ...cardSpec.sns };
      if (platform === 'instagram') {
        updatedSns.instagram = {
          ...cardSpec.sns.instagram,
          caption: content,
          hashtags: cardSpec.sns.instagram?.hashtags || [],
        };
      } else {
        updatedSns.threads = { text: content };
      }

      set((state) => ({
        cardSpec: state.cardSpec ? { ...state.cardSpec, sns: updatedSns } : null,
        unsavedChanges: true,
        editCount: state.editCount + 1,
      }));
      performAutoSave();
    },

    setStatus: async (status) => {
      const { cardSpec } = get();
      if (!cardSpec) return;

      const updatedMeta = { ...cardSpec.meta, status };
      set((state) => ({
        cardSpec: state.cardSpec ? { ...state.cardSpec, meta: updatedMeta } : null,
        unsavedChanges: true,
        editCount: state.editCount + 1,
      }));

      const authed = await isAuthenticated();
      if (authed) {
        try {
          set({ autoSaveStatus: 'saving' });
          const latestSpec = get().cardSpec;
          if (latestSpec) await updateCardSpec(cardSpec.meta.id, latestSpec);
          set({ autoSaveStatus: 'saved', unsavedChanges: false });
          setTimeout(() => {
            set((s) => (s.autoSaveStatus === 'saved' ? { autoSaveStatus: 'idle' } : s));
          }, 2000);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Status update failed';
          set({ autoSaveStatus: 'error', lastError: message });
        }
      }
    },

    setEditorMode: (mode) => set({ editorMode: mode }),
    markUnsaved: () => set({ unsavedChanges: true }),
    setAutoSaveStatus: (status) => set({ autoSaveStatus: status }),
    setLastError: (error) => set({ lastError: error }),
    setIsLoading: (loading) => set({ isLoading: loading }),
    reset: () => set(initialState),
  };
});

// ============================================================================
// Selectors
// ============================================================================

export const useSelectedCard = () =>
  useCardStore((state) => {
    if (!state.cardSpec || state.selectedCardIndex >= state.cardSpec.cards.length) return null;
    return state.cardSpec.cards[state.selectedCardIndex];
  });

export const useCardSpecMeta = () =>
  useCardStore((state) => state.cardSpec?.meta ?? null);

const EMPTY_CARDS: Card[] = [];
export const useAllCards = () =>
  useCardStore((state) => state.cardSpec?.cards ?? EMPTY_CARDS);

export const useAutoSaveStatus = () => {
  const status = useCardStore((state) => state.autoSaveStatus);
  const error = useCardStore((state) => state.lastError);
  return { status, error };
};

export const useEditCount = () =>
  useCardStore((state) => state.editCount);
