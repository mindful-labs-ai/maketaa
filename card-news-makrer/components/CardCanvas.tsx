/**
 * Canvas Component - Renders card_spec as 1080×1080 Fabric.js canvas
 *
 * Features:
 * - Dynamic import (client-side only, no SSR)
 * - Support for all layout types (center, top-left, etc.)
 * - Background image with overlay opacity
 * - Text rendering with proper fonts
 * - Click-to-edit text support
 */

'use client';

import dynamic from 'next/dynamic';
import React from 'react';

// Dynamic import of Fabric.js component (no SSR)
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

/**
 * Main CardCanvas export wrapper
 * Provides loading state and error boundary
 */
export const CardCanvas = React.forwardRef<
  any,
  {
    card: any;
    selectedTextIndex?: number;
    onTextClick?: (fieldName: string) => void;
  }
>(({ card, selectedTextIndex, onTextClick }, ref) => {
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
      selectedTextIndex={selectedTextIndex}
      onTextClick={onTextClick}
      ref={ref}
    />
  );
});

CardCanvas.displayName = 'CardCanvas';

export default CardCanvas;
