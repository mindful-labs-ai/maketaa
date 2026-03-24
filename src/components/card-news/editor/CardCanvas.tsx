'use client';

/**
 * CardCanvas - Wrapper that dynamically imports CardCanvasClient (no SSR)
 */

import dynamic from 'next/dynamic';
import React from 'react';

const CardCanvasClient = dynamic(
  () => import('./CardCanvasClient'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center w-full aspect-square bg-gray-100 rounded-lg border border-gray-200">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2" />
          <p className="text-sm text-gray-600">Loading canvas...</p>
        </div>
      </div>
    ),
  }
);

export const CardCanvas = React.forwardRef<
  unknown,
  {
    card: any;
    cardIndex?: number;
    selectedTextIndex?: number;
    onTextClick?: (fieldName: string) => void;
  }
>(({ card, cardIndex, selectedTextIndex, onTextClick }, ref) => {
  if (!card) {
    return (
      <div className="flex items-center justify-center w-full aspect-square bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <p className="text-gray-400">Select a card to begin</p>
      </div>
    );
  }

  return (
    <CardCanvasClient
      card={card}
      cardIndex={cardIndex ?? 0}
      selectedTextIndex={selectedTextIndex}
      onTextClick={onTextClick}
      ref={ref}
    />
  );
});

CardCanvas.displayName = 'CardCanvas';

export default CardCanvas;
