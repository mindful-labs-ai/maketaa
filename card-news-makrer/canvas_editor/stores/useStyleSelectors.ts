/**
 * Style Selectors - Granular Zustand selectors for style editing
 * Optimizes re-renders by providing focused selectors for specific style properties
 */

import { useCardStore, useSelectedCard } from './useCardStore';
import type {
  ColorPalette,
  CardLayout,
  FontStyle,
  CardStyle,
  CardBackground,
} from '@/lib/supabase';

// ============================================================================
// Color Palette Selector
// ============================================================================

/**
 * Get the selected card's color palette
 */
export const useCardPalette = (): ColorPalette | undefined => {
  return useCardStore((state) => {
    if (!state.cardSpec || state.selectedCardIndex >= state.cardSpec.cards.length) {
      return undefined;
    }
    return state.cardSpec.cards[state.selectedCardIndex].style.color_palette;
  });
};

// ============================================================================
// Layout Selector
// ============================================================================

/**
 * Get the selected card's layout
 */
export const useCardLayout = (): CardLayout | undefined => {
  return useCardStore((state) => {
    if (!state.cardSpec || state.selectedCardIndex >= state.cardSpec.cards.length) {
      return undefined;
    }
    return state.cardSpec.cards[state.selectedCardIndex].style.layout;
  });
};

// ============================================================================
// Font Sizes Selector
// ============================================================================

/**
 * Get the selected card's font sizes and families
 */
export const useCardFontSizes = (): {
  headline_size: number;
  body_size: number;
  headline_family: string;
  body_family: string;
} | null => {
  return useCardStore((state) => {
    if (!state.cardSpec || state.selectedCardIndex >= state.cardSpec.cards.length) {
      return null;
    }
    const font = state.cardSpec.cards[state.selectedCardIndex].style.font;
    return {
      headline_size: font?.headline_size ?? 36,
      body_size: font?.body_size ?? 18,
      headline_family: font?.headline_family ?? 'Pretendard',
      body_family: font?.body_family ?? 'Pretendard',
    };
  });
};

// ============================================================================
// Overlay Opacity Selector
// ============================================================================

/**
 * Get the selected card's background overlay opacity
 */
export const useCardOverlay = (): number => {
  return useCardStore((state) => {
    if (!state.cardSpec || state.selectedCardIndex >= state.cardSpec.cards.length) {
      return 0.3;
    }
    return state.cardSpec.cards[state.selectedCardIndex].background.overlay_opacity ?? 0.3;
  });
};

// ============================================================================
// Background Selector
// ============================================================================

/**
 * Get the selected card's background object
 */
export const useCardBackground = (): CardBackground | null => {
  return useCardStore((state) => {
    if (!state.cardSpec || state.selectedCardIndex >= state.cardSpec.cards.length) {
      return null;
    }
    return state.cardSpec.cards[state.selectedCardIndex].background;
  });
};

// ============================================================================
// Text Color Selector
// ============================================================================

/**
 * Get the selected card's text color from palette or style
 */
export const useCardTextColor = (): string | undefined => {
  return useCardStore((state) => {
    if (!state.cardSpec || state.selectedCardIndex >= state.cardSpec.cards.length) {
      return undefined;
    }
    const card = state.cardSpec.cards[state.selectedCardIndex];
    return card.style.color_palette?.text ?? '#FFFFFF';
  });
};

// ============================================================================
// Full Style Object Selector
// ============================================================================

/**
 * Get the selected card's full style object
 */
export const useCardFullStyle = (): CardStyle | null => {
  return useCardStore((state) => {
    if (!state.cardSpec || state.selectedCardIndex >= state.cardSpec.cards.length) {
      return null;
    }
    return state.cardSpec.cards[state.selectedCardIndex].style;
  });
};

// ============================================================================
// Background Type Selector
// ============================================================================

/**
 * Get the selected card's background type (image, gradient, solid)
 */
export const useCardBackgroundType = (): 'image' | 'gradient' | 'solid' => {
  return useCardStore((state) => {
    if (!state.cardSpec || state.selectedCardIndex >= state.cardSpec.cards.length) {
      return 'solid';
    }
    return state.cardSpec.cards[state.selectedCardIndex].background.type;
  });
};

// ============================================================================
// Helper: Update Hooks (wrapping store actions)
// ============================================================================

/**
 * Hook to update card style with automatic state management
 */
export const useUpdateCardStyle = () => {
  const updateCardStyle = useCardStore((state) => state.updateCardStyle);
  const selectedCardIndex = useCardStore((state) => state.selectedCardIndex);

  return async (styleUpdates: Partial<CardStyle>) => {
    return updateCardStyle(selectedCardIndex, styleUpdates);
  };
};

/**
 * Hook to update card background with automatic state management
 */
export const useUpdateCardBackground = () => {
  const updateCardBackground = useCardStore((state) => state.updateCardBackground);
  const selectedCardIndex = useCardStore((state) => state.selectedCardIndex);

  return async (backgroundUpdates: Partial<CardBackground>) => {
    return updateCardBackground(selectedCardIndex, backgroundUpdates);
  };
};
