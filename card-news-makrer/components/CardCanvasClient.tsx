/**
 * CardCanvas Client Component - Fabric.js Implementation
 * Renders a single card with text, background, and interactive elements
 */

'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';
import type { Card } from '@/types';

// ============================================================================
// Constants
// ============================================================================

const CANVAS_SIZE = 1080;
const TEXT_LIMITS = {
  headline: 15,
  body: 50,
  sub_text: -1, // No limit
};

const LAYOUT_POSITIONS = {
  center: { top: 0.5, left: 0.5, anchor: 'center' },
  'top-left': { top: 0.1, left: 0.05, anchor: 'left' },
  'top-right': { top: 0.1, left: 0.95, anchor: 'right' },
  'bottom-left': { top: 0.9, left: 0.05, anchor: 'left' },
  'bottom-right': { top: 0.9, left: 0.95, anchor: 'right' },
  split: { top: 0.5, left: 0.5, anchor: 'center' },
};

// ============================================================================
// Types
// ============================================================================

interface CardCanvasClientProps {
  card: Card;
  selectedTextIndex?: number;
  onTextClick?: (fieldName: string) => void;
}

// ============================================================================
// Component
// ============================================================================

const CardCanvasClient = React.forwardRef<any, CardCanvasClientProps>(
  ({ card, selectedTextIndex, onTextClick }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Initialize Fabric.js canvas
    useEffect(() => {
      if (!canvasRef.current) return;

      setIsLoading(true);

      // Create canvas
      const fabricCanvas = new fabric.Canvas(canvasRef.current, {
        width: CANVAS_SIZE,
        height: CANVAS_SIZE,
        backgroundColor: card.style?.color_palette?.background || '#F0F4F8',
      });

      fabricCanvasRef.current = fabricCanvas;

      // Load and render background
      const renderCard = async () => {
        try {
          // Add background image if available
          if (card.background?.src && card.background.type === 'image') {
            try {
              await new Promise<void>((resolve, reject) => {
                fabric.Image.fromURL(
                  card.background.src!,
                  (img) => {
                    if (!img) {
                      reject(new Error('Failed to load image'));
                      return;
                    }

                    // Scale image to fit canvas
                    const scale = Math.max(
                      CANVAS_SIZE / (img.width || 1),
                      CANVAS_SIZE / (img.height || 1)
                    );
                    img.scale(scale);
                    img.set({
                      left: CANVAS_SIZE / 2,
                      top: CANVAS_SIZE / 2,
                      originX: 'center',
                      originY: 'center',
                      selectable: false,
                      evented: false,
                    });

                    fabricCanvas.add(img);
                    fabricCanvas.sendToBack(img);

                    // Add overlay for text readability
                    const overlay = new fabric.Rect({
                      left: 0,
                      top: 0,
                      width: CANVAS_SIZE,
                      height: CANVAS_SIZE,
                      fill: 'rgba(0, 0, 0, ' +
                        (card.background?.overlay_opacity || 0.3) +
                        ')',
                      selectable: false,
                      evented: false,
                    });
                    fabricCanvas.add(overlay);
                    fabricCanvas.sendToBack(overlay);

                    resolve();
                  },
                  undefined,
                  { crossOrigin: 'anonymous' }
                );
              });
            } catch (error) {
              console.warn('[CardCanvas] Failed to load background image:', error);
            }
          }

          // Render text objects
          const positionConfig =
            LAYOUT_POSITIONS[card.style?.layout || 'center'];
          const baseX = CANVAS_SIZE * (positionConfig.left as number);
          const baseY = CANVAS_SIZE * (positionConfig.top as number);

          // Headline
          if (card.text?.headline) {
            const headline = new fabric.IText(card.text.headline, {
              fontSize: card.style?.font?.headline_size || 36,
              fontFamily:
                card.style?.font?.headline_family || 'Pretendard Bold',
              fill: card.style?.color_palette?.text || '#2D2D2D',
              left: baseX,
              top: baseY - 40,
              originX: 'center',
              originY: 'center',
              width: CANVAS_SIZE * 0.8,
              textAlign: 'center',
              selectable: false,
              evented: true,
              data: { fieldName: 'headline' },
            });

            headline.on('selected', () => {
              onTextClick?.('headline');
            });

            fabricCanvas.add(headline);
          }

          // Body
          if (card.text?.body) {
            const body = new fabric.IText(card.text.body, {
              fontSize: card.style?.font?.body_size || 18,
              fontFamily:
                card.style?.font?.body_family || 'Pretendard Regular',
              fill: card.style?.color_palette?.text || '#2D2D2D',
              left: baseX,
              top: baseY + 20,
              originX: 'center',
              originY: 'center',
              width: CANVAS_SIZE * 0.75,
              textAlign: 'center',
              selectable: false,
              evented: true,
              data: { fieldName: 'body' },
            });

            body.on('selected', () => {
              onTextClick?.('body');
            });

            fabricCanvas.add(body);
          }

          // Sub-text
          if (card.text?.sub_text) {
            const subText = new fabric.IText(card.text.sub_text, {
              fontSize: 14,
              fontFamily: 'Pretendard Regular',
              fill: card.style?.color_palette?.secondary || '#7B9EBD',
              left: baseX,
              top: baseY + 80,
              originX: 'center',
              originY: 'center',
              width: CANVAS_SIZE * 0.7,
              textAlign: 'center',
              selectable: false,
              evented: true,
              data: { fieldName: 'sub_text' },
            });

            subText.on('selected', () => {
              onTextClick?.('sub_text');
            });

            fabricCanvas.add(subText);
          }

          fabricCanvas.renderAll();
        } catch (error) {
          console.error('[CardCanvas] Error rendering card:', error);
        } finally {
          setIsLoading(false);
        }
      };

      renderCard();

      return () => {
        fabricCanvas.dispose();
      };
    }, [card, onTextClick]);

    return (
      <div className="flex items-center justify-center w-full">
        <div
          className="relative"
          style={{
            aspectRatio: '1 / 1',
            maxWidth: '600px',
            width: '100%',
          }}
        >
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          )}
          <canvas
            ref={canvasRef}
            className="w-full h-full shadow-lg rounded-lg border border-gray-200"
            style={{
              display: isLoading ? 'none' : 'block',
            }}
          />
        </div>
      </div>
    );
  }
);

CardCanvasClient.displayName = 'CardCanvasClient';

export default CardCanvasClient;
