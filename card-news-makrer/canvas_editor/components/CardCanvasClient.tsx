/**
 * CardCanvas Client Component - Fabric.js Implementation
 * Renders a single card with text, background, and interactive elements
 *
 * Canvas is initialized once and updated in-place when card data changes.
 * This avoids costly destroy/recreate cycles on every edit.
 *
 * Interaction model (Canva/Figma standard):
 * - Single click: select text (shows bounding box + handles)
 * - Drag: move text position
 * - Double click: enter inline text editing mode
 * - Corner handles: resize text box
 */

'use client';

import React, { useEffect, useRef, useCallback, useState, useImperativeHandle, useLayoutEffect } from 'react';
import * as fabric from 'fabric';
import type { Card } from '@/types';
import { useCardStore } from '@/stores/useCardStore';
import { CANVAS_RATIOS } from '@/lib/constants';
import { getTemplateForRole } from '@/lib/card-templates';
import { createQuoteBlock, createBulletListBlock, createDescriptionBlock } from '@/lib/fabric-blocks';

// ============================================================================
// Constants
// ============================================================================

const CANVAS_PADDING = 60;

// ============================================================================
// LongBlack Template Helpers
// ============================================================================

/**
 * Strip **keyword** highlight markers from text before rendering.
 * Fabric.js Textbox doesn't support inline mixed colors, so we strip
 * the markers and render plain text. Per-word color highlighting is a
 * future enhancement.
 */
function stripHighlightMarkers(text: string): string {
  return text.replace(/\*\*(.*?)\*\*/g, '$1');
}

// Emoji number characters for tip card numbered list
const EMOJI_NUMBERS = ['❶', '❷', '❸', '❹', '❺', '❻', '❼', '❽', '❾', '❿'];

/**
 * Dedicated renderer for the LongBlack Editorial template.
 * Handles each role with precise pixel positions matching the reference designs.
 * Called when isLongBlackTemplate is true; returns early to skip generic rendering.
 */
function renderLongBlackCard(
  fabricCanvas: fabric.Canvas,
  cardData: Card,
  cvW: number,
  cvH: number,
  interactiveTextOptions: Record<string, unknown>
): void {
  const role = cardData.role || 'content';

  // Font scale factor: bump sizes for taller canvases (4:5, 9:16)
  const fs = 1;

  // Accent color from card palette (supports multiple templates)
  const accentColor = cardData.style?.color_palette?.primary || '#4A7AFF';

  // ── Blue dot marker (all cards except memo — memo has it hidden under headline) ──
  const isMemo = cardData.role === 'content' && cardData.content_layout === 'memo';
  const dotTop = isMemo ? cvH * 0.06 : cvH * 0.07;
  const marker = new fabric.Circle({
    radius: 12,
    fill: accentColor,
    left: cvW * 0.10,
    top: dotTop,
    originX: 'center',
    originY: 'center',
    selectable: false,
    evented: false,
  });
  fabricCanvas.add(marker);

  // ── Brand text ──
  const brandText = new fabric.Text('@mindthos', {
    fontSize: Math.round(24 * fs),
    fontFamily: 'Georgia, serif',
    fill: 'rgba(255,255,255,0.35)',
    left: cvW * 0.5,
    top: cvH * 0.93,
    originX: 'center',
    originY: 'center',
    selectable: false,
    evented: false,
  });
  fabricCanvas.add(brandText);

  // ── COVER card ──
  if (role === 'cover') {
    const rawHeadline = cardData.text?.headline || '';
    const headlineText = stripHighlightMarkers(rawHeadline);
    if (headlineText) {
      const headline = new fabric.Textbox(headlineText, {
        fontSize: Math.round(80 * fs),
        fontWeight: 'bold',
        fontFamily: cardData.style?.font?.headline_family || 'Pretendard',
        fill: '#FFFFFF',
        left: cvW * 0.10,
        top: cvH * 0.28,
        originX: 'left',
        originY: 'top',
        width: cvW * 0.80,
        textAlign: 'left',
        lineHeight: 1.35,
        ...(interactiveTextOptions as object),
        data: { fieldName: 'headline', isPlaceholder: false },
      });
      fabricCanvas.add(headline);
    }
    // sub_text (hashtags) rendered faintly below
    const rawSub = cardData.text?.sub_text || '';
    if (rawSub) {
      const subText = new fabric.Textbox(rawSub, {
        fontSize: Math.round(32 * fs),
        fontFamily: 'Pretendard',
        fill: 'rgba(255,255,255,0.55)',
        left: cvW * 0.10,
        top: cvH * 0.82,
        originX: 'left',
        originY: 'top',
        width: cvW * 0.80,
        textAlign: 'left',
        ...(interactiveTextOptions as object),
        data: { fieldName: 'sub_text', isPlaceholder: false },
      });
      fabricCanvas.add(subText);
    }
    return;
  }

  // ── content/memo card (reference: card_news_design_07) ──
  if (role === 'content' && cardData.content_layout === 'memo') {
    // Headline — below the blue dot marker, with left padding clear of dot
    const rawHeadline = cardData.text?.headline || '';
    const headlineText = stripHighlightMarkers(rawHeadline);
    if (headlineText) {
      const headline = new fabric.Textbox(headlineText, {
        fontSize: Math.round(44 * fs),
        fontWeight: 'bold',
        fontFamily: cardData.style?.font?.headline_family || 'Pretendard',
        fill: '#FFFFFF',
        left: cvW * 0.08,
        top: cvH * 0.10,
        originX: 'left',
        originY: 'top',
        width: cvW * 0.84,
        textAlign: 'left',
        lineHeight: 1.35,
        ...(interactiveTextOptions as object),
        data: { fieldName: 'headline', isPlaceholder: false },
      });
      fabricCanvas.add(headline);
    }

    // Blue rounded box — enough room below headline, not overlapping @mindthos
    const boxTop = cvH * 0.24;
    const boxHeight = cvH * 0.64;
    const tipBox = new fabric.Rect({
      left: cvW * 0.06,
      top: boxTop,
      width: cvW * 0.88,
      height: boxHeight,
      rx: 20,
      ry: 20,
      fill: accentColor + '25',  // accent color at ~15% opacity for light tinted background
      selectable: false,
      evented: false,
    });
    fabricCanvas.add(tipBox);

    // Numbered list inside the box — matches user reference layout
    const bulletPoints = cardData.text?.bullet_points || [];
    if (bulletPoints.length > 0) {
      const count = bulletPoints.length;
      const innerPadding = 50;
      const itemStartY = boxTop + innerPadding;
      const usableHeight = boxHeight - innerPadding * 2;
      const itemGap = usableHeight / count;
      const fontBody = cardData.style?.font?.body_family || 'Pretendard';

      bulletPoints.forEach((item, i) => {
        const stripped = stripHighlightMarkers(item);

        // Split on \n or "=" to separate title and description
        const parts = stripped.split(/\n|(?==)/);
        const titlePart = parts[0]?.trim() || stripped;
        const descPart = parts.length > 1 ? parts.slice(1).join('').trim() : null;

        const yPos = itemStartY + i * itemGap;

        // Number circle (blue background, white number) — vertically centered with title
        const titleFontSize = Math.round(36 * fs);
        const circleRadius = Math.round(22 * fs);
        const circleCenterY = yPos + Math.round(titleFontSize / 2); // align center with title text center
        const numCircle = new fabric.Circle({
          radius: circleRadius,
          fill: accentColor,
          left: cvW * 0.12,
          top: circleCenterY,
          originX: 'center',
          originY: 'center',
          selectable: false,
          evented: false,
        });
        fabricCanvas.add(numCircle);

        const numText = new fabric.Text(`${i + 1}`, {
          fontSize: Math.round(26 * fs),
          fontWeight: 'bold',
          fontFamily: fontBody,
          fill: cardData.style?.color_palette?.background || '#2A2A2E',
          left: cvW * 0.12,
          top: circleCenterY,
          originX: 'center',
          originY: 'center',
          selectable: false,
          evented: false,
        });
        fabricCanvas.add(numText);

        // Title (blue bold) — tight gap after circle
        const titleObj = new fabric.Textbox(titlePart, {
          fontSize: titleFontSize,
          fontWeight: 'bold',
          fontFamily: fontBody,
          fill: accentColor,
          left: cvW * 0.17,
          top: yPos,
          originX: 'left',
          originY: 'top',
          width: cvW * 0.68,
          textAlign: 'left',
          lineHeight: 1.2,
          selectable: false,
          evented: false,
        });
        fabricCanvas.add(titleObj);

        // Description line (dark, regular)
        if (descPart) {
          const descObj = new fabric.Textbox(descPart, {
            fontSize: Math.round(32 * fs),
            fontWeight: 'normal',
            fontFamily: fontBody,
            fill: '#2A2A2E',
            left: cvW * 0.17,
            top: yPos + Math.round(46 * fs),
            originX: 'left',
            originY: 'top',
            width: cvW * 0.70,
            textAlign: 'left',
            lineHeight: 1.2,
            selectable: false,
            evented: false,
          });
          fabricCanvas.add(descObj);
        }
      });
    } else {
      // Fallback: show body text inside box
      const rawBody = cardData.text?.body || '';
      if (rawBody) {
        const bodyObj = new fabric.Textbox(stripHighlightMarkers(rawBody), {
          fontSize: Math.round(30 * fs),
          fontFamily: cardData.style?.font?.body_family || 'Pretendard',
          fill: '#2A2A2E',
          left: cvW * 0.12,
          top: boxTop + 30,
          originX: 'left',
          originY: 'top',
          width: cvW * 0.76,
          textAlign: 'left',
          lineHeight: 1.6,
          ...(interactiveTextOptions as object),
          data: { fieldName: 'body', isPlaceholder: false },
        });
        fabricCanvas.add(bodyObj);
      }
    }
    return;
  }

  // ── end card ── (reference design_08: image top half, text bottom half)
  if (role === 'end') {
    const splitY = cvH * 0.45;

    // Bottom half: darker area for text
    const bottomBg = new fabric.Rect({
      left: 0,
      top: splitY,
      width: cvW,
      height: cvH - splitY,
      fill: '#1E1E24',
      selectable: false,
      evented: false,
    });
    fabricCanvas.add(bottomBg);

    // Top half: if no background image, show a lighter decorative area
    if (!cardData.background?.src || cardData.background.type !== 'image') {
      const decoBox = new fabric.Rect({
        left: 0,
        top: 0,
        width: cvW,
        height: splitY,
        fill: '#3A3A4E',
        selectable: false,
        evented: false,
      });
      fabricCanvas.add(decoBox);
    }

    // Accent line at split point
    const separator = new fabric.Rect({
      left: cvW * 0.30,
      top: splitY + cvH * 0.04,
      width: cvW * 0.40,
      height: 3,
      fill: accentColor,
      selectable: false,
      evented: false,
    });
    fabricCanvas.add(separator);

    // Headline — below split, dynamic positioning
    let nextY = splitY + cvH * 0.07;
    const rawHeadline = cardData.text?.headline || '';
    if (rawHeadline) {
      const headline = new fabric.Textbox(stripHighlightMarkers(rawHeadline), {
        fontSize: Math.round(42 * fs),
        fontWeight: 'bold',
        fontFamily: cardData.style?.font?.headline_family || 'Pretendard',
        fill: '#FFFFFF',
        left: cvW * 0.5,
        top: nextY,
        originX: 'center',
        originY: 'top',
        width: cvW * 0.80,
        textAlign: 'center',
        lineHeight: 1.4,
        ...(interactiveTextOptions as object),
        data: { fieldName: 'headline', isPlaceholder: false },
      });
      fabricCanvas.add(headline);
      // Measure actual rendered height and advance nextY
      headline.initDimensions();
      nextY = headline.top! + headline.getScaledHeight() + Math.round(32 * fs);
    }
    // Body — positioned dynamically below headline
    const rawBody = cardData.text?.body || '';
    if (rawBody) {
      const body = new fabric.Textbox(stripHighlightMarkers(rawBody), {
        fontSize: Math.round(34 * fs),
        fontFamily: cardData.style?.font?.body_family || 'Pretendard',
        fill: 'rgba(255,255,255,0.85)',
        left: cvW * 0.5,
        top: nextY,
        originX: 'center',
        originY: 'top',
        width: cvW * 0.80,
        textAlign: 'center',
        lineHeight: 1.5,
        ...(interactiveTextOptions as object),
        data: { fieldName: 'body', isPlaceholder: false },
      });
      fabricCanvas.add(body);
    }
    // Sub text — anchored near bottom
    const rawSub = cardData.text?.sub_text || '';
    if (rawSub) {
      const subText = new fabric.Textbox(rawSub, {
        fontSize: Math.round(28 * fs),
        fontFamily: 'Pretendard',
        fill: 'rgba(255,255,255,0.5)',
        left: cvW * 0.5,
        top: cvH * 0.88,
        originX: 'center',
        originY: 'top',
        width: cvW * 0.80,
        textAlign: 'center',
        ...(interactiveTextOptions as object),
        data: { fieldName: 'sub_text', isPlaceholder: false },
      });
      fabricCanvas.add(subText);
    }
    return;
  }

  // ── Content cards (basic layout) — dynamic vertical positioning ──
  let contentNextY = cvH * 0.13;
  const rawHeadline = cardData.text?.headline || '';
  if (rawHeadline) {
    const headline = new fabric.Textbox(stripHighlightMarkers(rawHeadline), {
      fontSize: Math.round(42 * fs),
      fontWeight: 'bold',
      fontFamily: cardData.style?.font?.headline_family || 'Pretendard',
      fill: '#FFFFFF',
      left: cvW * 0.10,
      top: contentNextY,
      originX: 'left',
      originY: 'top',
      width: cvW * 0.80,
      textAlign: 'left',
      lineHeight: 1.6,
      ...(interactiveTextOptions as object),
      data: { fieldName: 'headline', isPlaceholder: false },
    });
    fabricCanvas.add(headline);
    // Measure actual height and advance position
    headline.initDimensions();
    contentNextY = headline.top! + headline.getScaledHeight() + Math.round(40 * fs);
  }

  const rawBody = cardData.text?.body || '';
  if (rawBody) {
    const body = new fabric.Textbox(stripHighlightMarkers(rawBody), {
      fontSize: Math.round(38 * fs),
      fontFamily: cardData.style?.font?.body_family || 'Pretendard',
      fill: '#FFFFFF',
      left: cvW * 0.10,
      top: contentNextY,
      originX: 'left',
      originY: 'top',
      width: cvW * 0.80,
      textAlign: 'left',
      lineHeight: 1.8,
      ...(interactiveTextOptions as object),
      data: { fieldName: 'body', isPlaceholder: false },
    });
    fabricCanvas.add(body);
  }

  const rawSub = cardData.text?.sub_text || '';
  if (rawSub) {
    const subText = new fabric.Textbox(rawSub, {
      fontSize: Math.round(28 * fs),
      fontFamily: 'Pretendard',
      fill: 'rgba(255,255,255,0.5)',
      left: cvW * 0.10,
      top: cvH * 0.80,
      originX: 'left',
      originY: 'top',
      width: cvW * 0.80,
      textAlign: 'left',
      ...(interactiveTextOptions as object),
      data: { fieldName: 'sub_text', isPlaceholder: false },
    });
    fabricCanvas.add(subText);
  }
}

// Selection style — blue theme matching Canva/Figma
const SELECTION_COLOR = '#4F90FF';

// Layout positions use fractions of canvas dimensions.
// All layouts keep text horizontally centered with adequate padding.
// Top/bottom variants only change vertical positioning.
const LAYOUT_POSITIONS: Record<string, { top: number; left: number; originX: 'left' | 'center' | 'right'; textAlign: 'left' | 'center' | 'right'; widthRatio: number }> = {
  center:         { top: 0.45, left: 0.5,  originX: 'center', textAlign: 'center', widthRatio: 0.8 },
  'top-left':     { top: 0.12, left: 0.08, originX: 'left',   textAlign: 'left',   widthRatio: 0.7 },
  'top-right':    { top: 0.12, left: 0.92, originX: 'right',  textAlign: 'right',  widthRatio: 0.7 },
  'bottom-left':  { top: 0.75, left: 0.08, originX: 'left',   textAlign: 'left',   widthRatio: 0.7 },
  'bottom-right': { top: 0.75, left: 0.92, originX: 'right',  textAlign: 'right',  widthRatio: 0.7 },
  split:          { top: 0.45, left: 0.5,  originX: 'center', textAlign: 'center', widthRatio: 0.45 },
};

/**
 * Clamp a text object's top position so it stays within canvas bounds.
 * topOffset: pixel offset from baseY (e.g. -40 for headline).
 * textHeight: approximate height of the text block.
 * cvHeight: canvas height in pixels.
 */
function clampTop(baseY: number, topOffset: number, textHeight: number, cvHeight: number): number {
  const desired = baseY + topOffset;
  const minTop = CANVAS_PADDING;
  const maxTop = cvHeight - CANVAS_PADDING - textHeight;
  return Math.max(minTop, Math.min(maxTop, desired));
}

// ============================================================================
// Types
// ============================================================================

interface CardCanvasClientProps {
  card: Card;
  cardIndex: number;
  selectedTextIndex?: number;
  onTextClick?: (fieldName: string) => void;
}

// ============================================================================
// Component
// ============================================================================

const CardCanvasClient = React.forwardRef<any, CardCanvasClientProps>(
  ({ card, cardIndex, selectedTextIndex: _selectedTextIndex, onTextClick }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
    const onTextClickRef = useRef(onTextClick);
    const [isLoading, setIsLoading] = useState(true);
    const containerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);
    // Cache loaded background images to avoid re-fetching
    const bgCacheRef = useRef<Map<string, fabric.Image>>(new Map());

    const updateCardText = useCardStore((state) => state.updateCardText);
    const canvasRatio = useCardStore((state) => state.canvasRatio);
    const ratioConfig = CANVAS_RATIOS[canvasRatio] || CANVAS_RATIOS['1:1'];
    const canvasWidth = ratioConfig.width;
    const canvasHeight = ratioConfig.height;

    // Expose fabricCanvas instance and export helper to parent via ref
    useImperativeHandle(ref, () => ({
      getCanvas: () => fabricCanvasRef.current,
      getCanvasForExport: async (): Promise<string | null> => {
        const fabricCanvas = fabricCanvasRef.current;
        if (!fabricCanvas) return null;
        // Hide placeholder objects before export
        const placeholders = fabricCanvas.getObjects().filter(
          (obj) => (obj as fabric.Textbox & { data?: { isPlaceholder?: boolean } }).data?.isPlaceholder === true
        );
        placeholders.forEach((obj) => obj.set('visible', false));
        fabricCanvas.renderAll();
        const dataUrl = fabricCanvas.toDataURL({ format: 'png', multiplier: 2 });
        // Restore visibility
        placeholders.forEach((obj) => obj.set('visible', true));
        fabricCanvas.renderAll();
        return dataUrl;
      },
    }));

    // Keep onTextClick ref up to date without triggering re-renders
    useEffect(() => {
      onTextClickRef.current = onTextClick;
    }, [onTextClick]);

    // =========================================================================
    // Render card content onto an existing canvas
    // =========================================================================

    const renderContent = useCallback(
      async (fabricCanvas: fabric.Canvas, cardData: Card, cvW: number, cvH: number) => {
        // Clear all objects but keep canvas alive
        fabricCanvas.getObjects().slice().forEach((obj) => fabricCanvas.remove(obj));

        // Resolve role-based template defaults
        const template = getTemplateForRole(cardData.role || 'content', cardData.content_layout);

        // Set background color — user palette takes priority over template fallback
        fabricCanvas.backgroundColor =
          cardData.style?.color_palette?.background ||
          template.background.solid_fallback;

        // Determine overlay opacity:
        // user-set value (even 0) wins if explicitly present, else template default
        const overlayOpacity =
          cardData.background?.overlay_opacity != null
            ? cardData.background.overlay_opacity
            : template.background.overlay_opacity;

        // Add background image if available
        if (
          cardData.background?.src &&
          cardData.background.type === 'image'
        ) {
          try {
            const src = cardData.background.src!;
            let img = bgCacheRef.current.get(src);
            if (!img) {
              img = await fabric.Image.fromURL(src, {
                crossOrigin: 'anonymous',
              });
              bgCacheRef.current.set(src, img);
            }

            const cloned = await img.clone();

            // For end cards in LongBlack template, image fills only the top 45%
            const isEndCard = cardData.role === 'end';
            const imgAreaH = isEndCard ? cvH * 0.45 : cvH;

            const scale = Math.max(
              cvW / (cloned.width || 1),
              imgAreaH / (cloned.height || 1)
            );
            cloned.scale(scale);
            cloned.set({
              left: cvW / 2,
              top: imgAreaH / 2,
              originX: 'center',
              originY: 'center',
              selectable: false,
              evented: false,
            });

            fabricCanvas.add(cloned);
            fabricCanvas.sendObjectToBack(cloned);

            // Overlay (covers only the image area)
            const overlay = new fabric.Rect({
              left: 0,
              top: 0,
              width: cvW,
              height: imgAreaH,
              fill: 'rgba(0, 0, 0, ' + overlayOpacity + ')',
              selectable: false,
              evented: false,
            });
            fabricCanvas.add(overlay);
          } catch (error) {
            console.warn('[CardCanvas] Failed to load background image:', error);
          }
        }

        // ----------------------------------------------------------------
        // LongBlack Editorial template detection
        // ----------------------------------------------------------------
        const isLongBlackTemplate = (() => {
          const bg = cardData.style?.color_palette?.background || '';
          if (bg === '#2A2A2E' || bg === '#333338') return true;
          // Check if luminance is very low (dark template)
          const hex = bg.replace('#', '');
          if (hex.length === 6) {
            const r = parseInt(hex.slice(0, 2), 16);
            const g = parseInt(hex.slice(2, 4), 16);
            const b = parseInt(hex.slice(4, 6), 16);
            return (r * 299 + g * 587 + b * 114) / 1000 < 60;
          }
          return false;
        })();

        // Whether card has an image background (affects default text color)
        const hasImageBg =
          !!(cardData.background?.src && cardData.background.type === 'image');

        // Common interactive text settings
        const interactiveTextOptions = {
          selectable: true,
          evented: true,
          editable: true,
          lockMovementX: false,
          lockMovementY: false,
          hasControls: true,
          hasBorders: true,
          hoverCursor: 'move',
          borderColor: SELECTION_COLOR,
          cornerColor: SELECTION_COLOR,
          cornerStyle: 'circle' as const,
          cornerSize: 10,
          transparentCorners: false,
        };

        // ----------------------------------------------------------------
        // LongBlack Editorial — dedicated renderer (early return)
        // ----------------------------------------------------------------
        if (isLongBlackTemplate) {
          renderLongBlackCard(fabricCanvas, cardData, cvW, cvH, interactiveTextOptions);
          fabricCanvas.renderAll();
          return;
        }

        /**
         * Resolve text color based on background brightness.
         * Priority: user palette → auto contrast based on background.
         */
        const bgColor = (
          cardData.style?.color_palette?.background ||
          template.background.solid_fallback
        );
        // Simple luminance check: parse hex color and determine if background is dark
        const isLightBg = (() => {
          if (hasImageBg) return false; // image bg with overlay → treat as dark
          const hex = bgColor.replace('#', '');
          if (hex.length !== 6) return true; // fallback: assume light
          const r = parseInt(hex.slice(0, 2), 16);
          const g = parseInt(hex.slice(2, 4), 16);
          const b = parseInt(hex.slice(4, 6), 16);
          return (r * 299 + g * 587 + b * 114) / 1000 > 128;
        })();

        const resolveTextColor = (
          _templateFill: string | undefined,
          paletteColor: string | undefined
        ): string => {
          if (paletteColor) return paletteColor;
          return isLightBg ? '#2D2D2D' : '#FFFFFF';
        };

        // Render text objects using LAYOUT_POSITIONS when user has set a manual
        // layout, or fall back to template positions.
        const userLayout = cardData.style?.layout;
        const positionConfig = userLayout
          ? LAYOUT_POSITIONS[userLayout]
          : null;

        // ----------------------------------------------------------------
        // Placeholder helpers
        // ----------------------------------------------------------------
        const PLACEHOLDER_FILL = '#AAAAAA';
        const PLACEHOLDER_TEXTS: Record<string, string> = {
          headline: '제목을 입력하세요',
          body: '본문을 입력하세요',
          sub_text: '부제를 입력하세요',
        };

        // Scale factor: same font size across all ratios
        const fontScale = 1;

        // Headline — always rendered (placeholder when empty)
        {
          const tmpl = template.headline;
          const rawText = cardData.text?.headline;
          const isPlaceholder = !rawText;
          const strippedText = isPlaceholder
            ? PLACEHOLDER_TEXTS.headline
            : stripHighlightMarkers(rawText!);
          const displayText = strippedText;

          // LongBlack role overrides
          const lbRole = isLongBlackTemplate
            ? (cardData.role && ['cover','content','end'].includes(cardData.role)
                ? cardData.role
                : null)
            : null;
          const isMemoLayout = cardData.role === 'content' && cardData.content_layout === 'memo';
          const lbRoleOverrides: Record<string, { headline_size?: number; headline_top?: number; text_align?: 'left'|'center'; line_height?: number }> = {
            cover:   { headline_size: 72, headline_top: 0.30, text_align: 'left' },
            content: isMemoLayout
              ? { headline_size: 38, headline_top: 0.06, text_align: 'left' }
              : { headline_size: 30, headline_top: 0.14, text_align: 'left' },
            end:     { headline_size: 34, headline_top: 0.55, text_align: 'center' },
          };
          const lbOverride = lbRole ? lbRoleOverrides[lbRole] : null;

          const baseFontSize = cardData.style?.font?.headline_size ?? (lbOverride?.headline_size ?? tmpl.fontSize);
          const fontSize = Math.min(Math.round(baseFontSize * fontScale), 64);

          let left: number;
          let top: number;
          let originX: string;
          let textAlign: string;
          let textWidth: number;

          if (isLongBlackTemplate && lbOverride) {
            const lbAlign = lbOverride.text_align ?? 'left';
            if (lbAlign === 'center') {
              left = cvW * 0.5;
              originX = 'center';
            } else {
              left = cvW * 0.08;
              originX = 'left';
            }
            top = cvH * (lbOverride.headline_top ?? 0.14);
            textAlign = lbAlign;
            textWidth = cvW * 0.84;
          } else if (positionConfig) {
            left = cvW * positionConfig.left;
            const baseY = cvH * positionConfig.top;
            top = clampTop(baseY, -40, fontSize * 1.4, cvH);
            originX = positionConfig.originX;
            textAlign = positionConfig.textAlign;
            textWidth = cvW * positionConfig.widthRatio;
          } else {
            left = cvW * tmpl.left;
            top = cvH * tmpl.top;
            originX = tmpl.originX;
            textAlign = tmpl.textAlign;
            textWidth = cvW * tmpl.width;
          }

          // For tip cards on LongBlack, headline sits above the box so stays white;
          // body inside box uses dark text — handled below.
          const headlineFill = isPlaceholder
            ? PLACEHOLDER_FILL
            : isLongBlackTemplate
              ? '#FFFFFF'
              : resolveTextColor(tmpl.fill, cardData.style?.color_palette?.text);

          const headline = new fabric.Textbox(displayText, {
            fontSize: Math.min(fontSize, 48),
            fontStyle: isPlaceholder ? 'italic' : 'normal',
            fontFamily: cardData.style?.font?.headline_family || 'Pretendard',
            fill: headlineFill,
            left,
            top,
            originX: originX as any,
            originY: 'top',
            width: textWidth,
            textAlign: textAlign as any,
            ...interactiveTextOptions,
            data: { fieldName: 'headline', isPlaceholder },
          });
          fabricCanvas.add(headline);
        }

        // Body — rendered when field is defined (including empty string)
        if (cardData.text !== undefined && 'body' in (cardData.text || {})) {
          const tmpl = template.body;
          const rawText = cardData.text?.body;
          const isPlaceholder = !rawText;
          const displayText = isPlaceholder
            ? PLACEHOLDER_TEXTS.body
            : stripHighlightMarkers(rawText!);

          // LongBlack body role overrides
          const lbBodyOverrides: Record<string, { body_size?: number; body_top?: number; text_align?: 'left'|'center'; line_height?: number }> = {
            cover:   { body_size: 28, body_top: 0.60, text_align: 'left',   line_height: 1.3 },
            content: isMemoLayout
              ? { body_size: 24, body_top: 0.26, text_align: 'left', line_height: 1.6 }
              : { body_size: 30, body_top: 0.22, text_align: 'left', line_height: 1.8 },
            end:     { body_size: 22, body_top: 0.72, text_align: 'center', line_height: 1.5 },
          };
          const lbBodyOverride = isLongBlackTemplate && cardData.role
            ? lbBodyOverrides[cardData.role] ?? null
            : null;

          const baseFontSize = cardData.style?.font?.body_size ?? (lbBodyOverride?.body_size ?? tmpl.fontSize);
          const fontSize = Math.round(baseFontSize * fontScale);
          const lineHeight = lbBodyOverride?.line_height ?? tmpl.lineHeight;

          let left: number;
          let top: number;
          let originX: string;
          let textAlign: string;
          let textWidth: number;

          if (isLongBlackTemplate && lbBodyOverride) {
            const lbAlign = lbBodyOverride.text_align ?? 'left';
            if (lbAlign === 'center') {
              left = cvW * 0.5;
              originX = 'center';
            } else {
              left = cvW * 0.08;
              originX = 'left';
            }
            top = cvH * (lbBodyOverride.body_top ?? 0.22);
            textAlign = lbAlign;
            // memo box inner padding
            textWidth = isMemoLayout ? cvW * 0.76 : cvW * 0.84;
          } else if (positionConfig) {
            left = cvW * positionConfig.left;
            const baseY = cvH * positionConfig.top;
            top = clampTop(baseY, 60, fontSize * 2.8, cvH);
            originX = positionConfig.originX;
            textAlign = positionConfig.textAlign;
            textWidth = cvW * positionConfig.widthRatio;
          } else {
            left = cvW * tmpl.left;
            top = cvH * tmpl.top;
            originX = tmpl.originX;
            textAlign = tmpl.textAlign;
            textWidth = cvW * tmpl.width;
          }

          // Memo card body sits on the light-blue box → use dark text
          const bodyFill = isPlaceholder
            ? PLACEHOLDER_FILL
            : isLongBlackTemplate && isMemoLayout
              ? '#2A2A2E'
              : isLongBlackTemplate
                ? '#FFFFFF'
                : resolveTextColor(tmpl.fill, cardData.style?.color_palette?.text);

          const body = new fabric.Textbox(displayText, {
            fontSize,
            fontStyle: isPlaceholder ? 'italic' : 'normal',
            fontFamily: cardData.style?.font?.body_family || 'Pretendard',
            fill: bodyFill,
            left,
            top,
            originX: originX as any,
            originY: 'top',
            width: textWidth,
            textAlign: textAlign as any,
            lineHeight,
            ...interactiveTextOptions,
            data: { fieldName: 'body', isPlaceholder },
          });
          fabricCanvas.add(body);
        }

        // Sub-text — rendered when field is defined (including empty string)
        if (cardData.text !== undefined && 'sub_text' in (cardData.text || {})) {
          const subRawText = cardData.text?.sub_text;
          const subIsPlaceholder = !subRawText;
          const subDisplayText = subIsPlaceholder ? PLACEHOLDER_TEXTS.sub_text : subRawText!;
          const subFontSize = Math.max(Math.round((template.sub_text.fontSize || 20) * fontScale), 20);

          // Use same positioning logic as body but with larger offset
          let subLeft: number;
          let subTop: number;
          let subOriginX: string;
          let subTextAlign: string;
          let subTextWidth: number;
          if (positionConfig) {
            subLeft = cvW * positionConfig.left;
            const baseY = cvH * positionConfig.top;
            subTop = clampTop(baseY, 120, subFontSize * 1.4, cvH);
            subOriginX = positionConfig.originX;
            subTextAlign = positionConfig.textAlign;
            subTextWidth = cvW * positionConfig.widthRatio;
          } else {
            subLeft = cvW * template.sub_text.left;
            subTop = cvH * template.sub_text.top;
            subOriginX = template.sub_text.originX;
            subTextAlign = template.sub_text.textAlign;
            subTextWidth = cvW * template.sub_text.width;
          }

          const subText = new fabric.Textbox(subDisplayText, {
            fontSize: subFontSize,
            fontFamily: 'Pretendard',
            fill: subIsPlaceholder
              ? PLACEHOLDER_FILL
              : resolveTextColor(undefined, cardData.style?.color_palette?.secondary),
            left: subLeft,
            top: subTop,
            originX: subOriginX as any,
            originY: 'top',
            width: subTextWidth,
            textAlign: subTextAlign as any,
            ...interactiveTextOptions,
            data: { fieldName: 'sub_text', isPlaceholder: subIsPlaceholder },
          });
          fabricCanvas.add(subText);
        }

        // ----------------------------------------------------------------
        // Content blocks — rendered below existing text elements.
        // Only added when the new fields are present; existing cards are unaffected.
        // ----------------------------------------------------------------

        // Resolve accent color: user primary palette → template body fill → default blue
        const accentColor =
          cardData.style?.color_palette?.primary ||
          template.body.fill ||
          '#4F90FF';

        // Base font for content blocks
        const blockFontFamily =
          cardData.style?.font?.body_family || 'Pretendard';

        // Body text color reused for block text
        const blockTextColor = resolveTextColor(
          template.body.fill,
          cardData.style?.color_palette?.text
        );

        // Left edge of blocks (matches body left-aligned position)
        const blockLeft = positionConfig
          ? (positionConfig.originX === 'left' ? cvW * positionConfig.left : cvW * 0.1)
          : cvW * 0.1;
        const blockWidth = cvW * 0.78;

        // Track vertical offset so blocks stack below the last rendered text.
        // Use the layout position + offsets for each field, then add a gap.
        const layoutTop = positionConfig ? cvH * positionConfig.top : cvH * 0.45;
        const lastFieldOffset = cardData.text?.sub_text !== undefined ? 180 : 120;
        let blockTop = layoutTop + lastFieldOffset;

        const BLOCK_GAP = 24; // px between stacked blocks

        // Description block
        if (cardData.text?.description) {
          const descBlock = createDescriptionBlock(cardData.text.description, {
            left: blockLeft,
            top: blockTop,
            width: blockWidth,
            fill: blockTextColor,
            fontFamily: blockFontFamily,
            fontSize: Math.round(template.body.fontSize * 0.82 * fontScale),
            accentColor,
          });
          fabricCanvas.add(descBlock);
          blockTop += descBlock.height + BLOCK_GAP;
        }

        // Quote block
        if (cardData.text?.quote) {
          const quoteBlock = createQuoteBlock(cardData.text.quote, {
            left: blockLeft,
            top: blockTop,
            width: blockWidth,
            fill: blockTextColor,
            fontFamily: blockFontFamily,
            fontSize: Math.round(template.body.fontSize * 0.85 * fontScale),
            accentColor,
          });
          fabricCanvas.add(quoteBlock);
          blockTop += quoteBlock.height + BLOCK_GAP;
        }

        // Bullet list block
        if (cardData.text?.bullet_points && cardData.text.bullet_points.length > 0) {
          const bulletBlock = createBulletListBlock(cardData.text.bullet_points, {
            left: blockLeft,
            top: blockTop,
            width: blockWidth,
            fill: blockTextColor,
            fontFamily: blockFontFamily,
            fontSize: Math.round(template.body.fontSize * 0.82 * fontScale),
            accentColor,
          });
          fabricCanvas.add(bulletBlock);
        }

        // Brand text at bottom — Editorial signature
        if (isLongBlackTemplate) {
          const brandText = new fabric.Text('@mindthos', {
            fontSize: 24,
            fontFamily: 'Georgia, serif',
            fill: 'rgba(255,255,255,0.35)',
            left: cvW * 0.5,
            top: cvH * 0.92,
            originX: 'center',
            originY: 'center',
            selectable: false,
            evented: false,
          });
          fabricCanvas.add(brandText);
        }

        fabricCanvas.renderAll();
      },
      []
    );

    // =========================================================================
    // Initialize canvas ONCE
    // =========================================================================

    useEffect(() => {
      if (!canvasRef.current) return;

      const fabricCanvas = new fabric.Canvas(canvasRef.current, {
        width: canvasWidth,
        height: canvasHeight,
        backgroundColor: '#F0F4F8',
      });

      fabricCanvasRef.current = fabricCanvas;

      // Placeholder text constants (must match renderContent)
      const PLACEHOLDER_TEXTS: Record<string, string> = {
        headline: '제목을 입력하세요',
        body: '본문을 입력하세요',
        sub_text: '부제를 입력하세요',
      };

      // Double-click: clear placeholder so user can type immediately
      fabricCanvas.on('mouse:dblclick', (e) => {
        const target = e.target as fabric.Textbox & {
          data?: { fieldName?: string; isPlaceholder?: boolean };
        };
        if (target && target.data?.fieldName) {
          onTextClickRef.current?.(target.data.fieldName);
          // If the object is a placeholder, select all text so typing replaces it
          if (target.data.isPlaceholder) {
            target.selectAll();
          }
        }
      });

      // Sync text content to Zustand store after inline editing
      fabricCanvas.on('text:changed', (e) => {
        const target = e.target as fabric.Textbox & {
          data?: { fieldName?: string; isPlaceholder?: boolean };
        };
        if (target && target.data?.fieldName) {
          const fieldName = target.data.fieldName as 'headline' | 'body' | 'sub_text';
          let newText = target.text || '';
          // If user typed text that equals the placeholder, treat as empty
          if (newText === PLACEHOLDER_TEXTS[fieldName]) {
            newText = '';
          }
          const currentIndex = useCardStore.getState().selectedCardIndex;
          useCardStore.getState().updateCardText(currentIndex, fieldName, newText).catch((err) => {
            console.warn('[CardCanvas] Failed to sync inline text edit:', err);
          });
        }
      });

      // When editing ends: if text is empty, store empty string so placeholder is restored on next render
      fabricCanvas.on('text:editing:exited', (e) => {
        const target = e.target as fabric.Textbox & {
          data?: { fieldName?: string; isPlaceholder?: boolean };
        };
        if (target && target.data?.fieldName) {
          const fieldName = target.data.fieldName as 'headline' | 'body' | 'sub_text';
          const currentText = target.text || '';
          // If empty or still showing placeholder text, save empty string
          if (!currentText || currentText === PLACEHOLDER_TEXTS[fieldName]) {
            const currentIndex = useCardStore.getState().selectedCardIndex;
            useCardStore.getState().updateCardText(currentIndex, fieldName, '').catch((err) => {
              console.warn('[CardCanvas] Failed to clear text on edit exit:', err);
            });
          }
        }
      });

      setIsLoading(false);

      return () => {
        fabricCanvas.dispose();
        fabricCanvasRef.current = null;
        bgCacheRef.current.clear(); // Release cached image references
      };
    }, []); // Only runs once on mount

    // =========================================================================
    // Update canvas content when card data changes
    // =========================================================================

    useEffect(() => {
      const fabricCanvas = fabricCanvasRef.current;
      if (!fabricCanvas || !card) return;

      // Resize canvas when ratio changes
      if (fabricCanvas.width !== canvasWidth || fabricCanvas.height !== canvasHeight) {
        fabricCanvas.setDimensions({ width: canvasWidth, height: canvasHeight });
      }

      renderContent(fabricCanvas, card, canvasWidth, canvasHeight).then(() => {
        // Re-render after fonts are loaded to ensure custom fonts display correctly
        if (document.fonts?.ready) {
          document.fonts.ready.then(() => {
            fabricCanvas.getObjects().forEach((obj) => {
              if (obj instanceof fabric.Textbox || obj instanceof fabric.Text) {
                obj.initDimensions();
              }
            });
            fabricCanvas.renderAll();
          });
        }
      });
    }, [card, canvasWidth, canvasHeight, renderContent]);

    // =========================================================================
    // Scale canvas to fit container using CSS transform
    // =========================================================================

    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const updateScale = () => {
        const rect = container.getBoundingClientRect();
        const scaleX = rect.width / canvasWidth;
        const scaleY = rect.height / canvasHeight;
        setScale(Math.min(scaleX, scaleY, 1));
      };

      updateScale();

      const observer = new ResizeObserver(updateScale);
      observer.observe(container);
      return () => observer.disconnect();
    }, [canvasWidth, canvasHeight]);

    return (
      <div ref={containerRef} className="flex items-center justify-center w-full h-full overflow-hidden">
        <div
          style={{
            width: canvasWidth,
            height: canvasHeight,
            transform: `scale(${scale})`,
            transformOrigin: 'center center',
            flexShrink: 0,
          }}
        >
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400" />
            </div>
          )}
          <canvas ref={canvasRef} />
        </div>
      </div>
    );
  }
);

CardCanvasClient.displayName = 'CardCanvasClient';

export default CardCanvasClient;
