/**
 * Style Selectors - Granular Zustand selectors for style editing
 * Uses individual primitive selectors to avoid infinite loops in React 19
 */

import { useCardStore } from './useCardStore';
import type {
  ColorPalette,
  CardLayout,
  CardStyle,
  CardBackground,
} from '@/lib/card-news/types';

// Helper: get the selected card safely
function getSelectedCard(state: ReturnType<typeof useCardStore.getState>) {
  if (!state.cardSpec || state.selectedCardIndex >= state.cardSpec.cards.length) return null;
  return state.cardSpec.cards[state.selectedCardIndex];
}

export const useCardPalette = (): ColorPalette | undefined =>
  useCardStore((state) => getSelectedCard(state)?.style.color_palette);

export const useCardLayout = (): CardLayout | undefined =>
  useCardStore((state) => getSelectedCard(state)?.style.layout);

// Individual primitive selectors instead of returning a new object
export const useCardHeadlineSize = (): number =>
  useCardStore((state) => getSelectedCard(state)?.style.font?.headline_size ?? 36);

export const useCardBodySize = (): number =>
  useCardStore((state) => getSelectedCard(state)?.style.font?.body_size ?? 18);

export const useCardHeadlineFamily = (): string =>
  useCardStore((state) => getSelectedCard(state)?.style.font?.headline_family ?? 'Pretendard');

export const useCardBodyFamily = (): string =>
  useCardStore((state) => getSelectedCard(state)?.style.font?.body_family ?? 'Pretendard');

// Backwards-compatible composite hook (uses individual selectors to avoid new-object loop)
export const useCardFontSizes = (): {
  headline_size: number;
  body_size: number;
  headline_family: string;
  body_family: string;
} | null => {
  const hasCard = useCardStore((state) => getSelectedCard(state) !== null);
  const headline_size = useCardHeadlineSize();
  const body_size = useCardBodySize();
  const headline_family = useCardHeadlineFamily();
  const body_family = useCardBodyFamily();

  if (!hasCard) return null;
  return { headline_size, body_size, headline_family, body_family };
};

export const useCardOverlay = (): number =>
  useCardStore((state) => getSelectedCard(state)?.background.overlay_opacity ?? 0.3);

export const useCardBackground = (): CardBackground | null =>
  useCardStore((state) => getSelectedCard(state)?.background ?? null);

export const useCardTextColor = (): string | undefined =>
  useCardStore((state) => getSelectedCard(state)?.style.color_palette?.text ?? '#FFFFFF');

export const useCardFullStyle = (): CardStyle | null =>
  useCardStore((state) => getSelectedCard(state)?.style ?? null);

export const useCardBackgroundType = (): 'image' | 'gradient' | 'solid' =>
  useCardStore((state) => getSelectedCard(state)?.background.type ?? 'solid');

export const useUpdateCardStyle = () => {
  const updateCardStyle = useCardStore((state) => state.updateCardStyle);
  const selectedCardIndex = useCardStore((state) => state.selectedCardIndex);
  return async (styleUpdates: Partial<CardStyle>) => updateCardStyle(selectedCardIndex, styleUpdates);
};

export const useUpdateCardBackground = () => {
  const updateCardBackground = useCardStore((state) => state.updateCardBackground);
  const selectedCardIndex = useCardStore((state) => state.selectedCardIndex);
  return async (backgroundUpdates: Partial<CardBackground>) => updateCardBackground(selectedCardIndex, backgroundUpdates);
};
