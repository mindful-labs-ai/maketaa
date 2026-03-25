'use client';

/**
 * CardCanvasClient - Fabric.js canvas renderer for a single card.
 *
 * Uses dynamic import for fabric.js (no SSR). Canvas is initialized once
 * and updated in-place when card data changes, avoiding destroy/recreate cycles.
 *
 * Interaction model:
 * - Single click: select text (bounding box + handles)
 * - Drag: move text position
 * - Double click: enter inline text editing mode
 * - Corner handles: resize text box
 */

import React, {
  useEffect,
  useRef,
  useCallback,
  useState,
  useImperativeHandle,
} from 'react';
import type { Card } from '@/lib/card-news/types';
import { useCardStore } from '@/stores/card-news/useCardStore';
import { CANVAS_RATIOS } from '@/lib/card-news/constants';
import { getTemplateForRole } from '@/lib/card-news/card-templates';
import { createQuoteBlock, createBulletListBlock, createDescriptionBlock } from '@/lib/card-news/fabric-blocks';

// ============================================================================
// Constants
// ============================================================================

const CANVAS_PADDING = 60;
const SELECTION_COLOR = '#4F90FF';

const LAYOUT_POSITIONS: Record<string, {
  top: number; left: number;
  originX: 'left' | 'center' | 'right';
  textAlign: 'left' | 'center' | 'right';
  widthRatio: number;
}> = {
  center:         { top: 0.45, left: 0.5,  originX: 'center', textAlign: 'center', widthRatio: 0.8 },
  'top-left':     { top: 0.12, left: 0.08, originX: 'left',   textAlign: 'left',   widthRatio: 0.7 },
  'top-right':    { top: 0.12, left: 0.92, originX: 'right',  textAlign: 'right',  widthRatio: 0.7 },
  'bottom-left':  { top: 0.75, left: 0.08, originX: 'left',   textAlign: 'left',   widthRatio: 0.7 },
  'bottom-right': { top: 0.75, left: 0.92, originX: 'right',  textAlign: 'right',  widthRatio: 0.7 },
  split:          { top: 0.45, left: 0.5,  originX: 'center', textAlign: 'center', widthRatio: 0.45 },
};

// ============================================================================
// Helpers
// ============================================================================

function stripHighlightMarkers(text: string): string {
  return text.replace(/\*\*(.*?)\*\*/g, '$1');
}

function clampTop(baseY: number, topOffset: number, textHeight: number, cvHeight: number): number {
  const desired = baseY + topOffset;
  const minTop = CANVAS_PADDING;
  const maxTop = cvHeight - CANVAS_PADDING - textHeight;
  return Math.max(minTop, Math.min(maxTop, desired));
}

// ============================================================================
// LongBlack Template Renderer
// ============================================================================

function renderLongBlackCard(
  fabricCanvas: import('fabric').Canvas,
  cardData: Card,
  cvW: number,
  cvH: number,
  interactiveTextOptions: Record<string, unknown>,
  fabric: typeof import('fabric')
): void {
  const role = cardData.role || 'content';
  const fs = 1;
  const accentColor = cardData.style?.color_palette?.primary || '#4A7AFF';
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

  const brandText = new fabric.Text('@maketaa', {
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

  if (role === 'cover') {
    const headlineText = stripHighlightMarkers(cardData.text?.headline || '');
    if (headlineText) {
      fabricCanvas.add(new fabric.Textbox(headlineText, {
        fontSize: Math.round(80 * fs),
        fontWeight: 'bold',
        fontFamily: cardData.style?.font?.headline_family || 'Pretendard',
        fill: '#FFFFFF',
        left: cvW * 0.10, top: cvH * 0.28,
        originX: 'left', originY: 'top',
        width: cvW * 0.80, textAlign: 'left', lineHeight: 1.35,
        ...(interactiveTextOptions as object),
        data: { fieldName: 'headline', isPlaceholder: false },
      }));
    }
    const rawSub = cardData.text?.sub_text || '';
    if (rawSub) {
      fabricCanvas.add(new fabric.Textbox(rawSub, {
        fontSize: Math.round(32 * fs),
        fontFamily: 'Pretendard', fill: 'rgba(255,255,255,0.55)',
        left: cvW * 0.10, top: cvH * 0.82,
        originX: 'left', originY: 'top',
        width: cvW * 0.80, textAlign: 'left',
        ...(interactiveTextOptions as object),
        data: { fieldName: 'sub_text', isPlaceholder: false },
      }));
    }
    return;
  }

  if (role === 'content' && cardData.content_layout === 'memo') {
    const headlineText = stripHighlightMarkers(cardData.text?.headline || '');
    if (headlineText) {
      fabricCanvas.add(new fabric.Textbox(headlineText, {
        fontSize: Math.round(44 * fs), fontWeight: 'bold',
        fontFamily: cardData.style?.font?.headline_family || 'Pretendard',
        fill: '#FFFFFF', left: cvW * 0.08, top: cvH * 0.10,
        originX: 'left', originY: 'top', width: cvW * 0.84, textAlign: 'left', lineHeight: 1.35,
        ...(interactiveTextOptions as object),
        data: { fieldName: 'headline', isPlaceholder: false },
      }));
    }
    const boxTop = cvH * 0.24;
    const boxHeight = cvH * 0.64;
    fabricCanvas.add(new fabric.Rect({
      left: cvW * 0.06, top: boxTop, width: cvW * 0.88, height: boxHeight,
      rx: 20, ry: 20, fill: accentColor + '25', selectable: false, evented: false,
    }));

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
        const parts = stripped.split(/\n|(?==)/);
        const titlePart = parts[0]?.trim() || stripped;
        const descPart = parts.length > 1 ? parts.slice(1).join('').trim() : null;
        const yPos = itemStartY + i * itemGap;
        const titleFontSize = Math.round(36 * fs);
        const circleRadius = Math.round(22 * fs);
        const circleCenterY = yPos + Math.round(titleFontSize / 2);

        fabricCanvas.add(new fabric.Circle({
          radius: circleRadius, fill: accentColor,
          left: cvW * 0.12, top: circleCenterY,
          originX: 'center', originY: 'center', selectable: false, evented: false,
        }));
        fabricCanvas.add(new fabric.Text(`${i + 1}`, {
          fontSize: Math.round(26 * fs), fontWeight: 'bold', fontFamily: fontBody,
          fill: cardData.style?.color_palette?.background || '#2A2A2E',
          left: cvW * 0.12, top: circleCenterY,
          originX: 'center', originY: 'center', selectable: false, evented: false,
        }));
        fabricCanvas.add(new fabric.Textbox(titlePart, {
          fontSize: titleFontSize, fontWeight: 'bold', fontFamily: fontBody,
          fill: accentColor, left: cvW * 0.17, top: yPos,
          originX: 'left', originY: 'top', width: cvW * 0.68, textAlign: 'left', lineHeight: 1.2,
          selectable: false, evented: false,
        }));
        if (descPart) {
          fabricCanvas.add(new fabric.Textbox(descPart, {
            fontSize: Math.round(32 * fs), fontFamily: fontBody, fill: '#2A2A2E',
            left: cvW * 0.17, top: yPos + Math.round(46 * fs),
            originX: 'left', originY: 'top', width: cvW * 0.70, textAlign: 'left', lineHeight: 1.2,
            selectable: false, evented: false,
          }));
        }
      });
    } else {
      const rawBody = cardData.text?.body || '';
      if (rawBody) {
        fabricCanvas.add(new fabric.Textbox(stripHighlightMarkers(rawBody), {
          fontSize: Math.round(30 * fs), fontFamily: cardData.style?.font?.body_family || 'Pretendard',
          fill: '#2A2A2E', left: cvW * 0.12, top: boxTop + 30,
          originX: 'left', originY: 'top', width: cvW * 0.76, textAlign: 'left', lineHeight: 1.6,
          ...(interactiveTextOptions as object),
          data: { fieldName: 'body', isPlaceholder: false },
        }));
      }
    }
    return;
  }

  if (role === 'end') {
    const splitY = cvH * 0.45;
    fabricCanvas.add(new fabric.Rect({
      left: 0, top: splitY, width: cvW, height: cvH - splitY, fill: '#1E1E24',
      selectable: false, evented: false,
    }));
    if (!cardData.background?.src || cardData.background.type !== 'image') {
      fabricCanvas.add(new fabric.Rect({
        left: 0, top: 0, width: cvW, height: splitY, fill: '#3A3A4E',
        selectable: false, evented: false,
      }));
    }
    fabricCanvas.add(new fabric.Rect({
      left: cvW * 0.30, top: splitY + cvH * 0.04, width: cvW * 0.40, height: 3,
      fill: accentColor, selectable: false, evented: false,
    }));

    let nextY = splitY + cvH * 0.07;
    const rawHeadline = cardData.text?.headline || '';
    if (rawHeadline) {
      const headline = new fabric.Textbox(stripHighlightMarkers(rawHeadline), {
        fontSize: Math.round(42 * fs), fontWeight: 'bold',
        fontFamily: cardData.style?.font?.headline_family || 'Pretendard',
        fill: '#FFFFFF', left: cvW * 0.5, top: nextY,
        originX: 'center', originY: 'top', width: cvW * 0.80, textAlign: 'center', lineHeight: 1.4,
        ...(interactiveTextOptions as object),
        data: { fieldName: 'headline', isPlaceholder: false },
      });
      fabricCanvas.add(headline);
      headline.initDimensions();
      nextY = headline.top! + headline.getScaledHeight() + Math.round(32 * fs);
    }
    const rawBody = cardData.text?.body || '';
    if (rawBody) {
      fabricCanvas.add(new fabric.Textbox(stripHighlightMarkers(rawBody), {
        fontSize: Math.round(34 * fs), fontFamily: cardData.style?.font?.body_family || 'Pretendard',
        fill: 'rgba(255,255,255,0.85)', left: cvW * 0.5, top: nextY,
        originX: 'center', originY: 'top', width: cvW * 0.80, textAlign: 'center', lineHeight: 1.5,
        ...(interactiveTextOptions as object),
        data: { fieldName: 'body', isPlaceholder: false },
      }));
    }
    const rawSub = cardData.text?.sub_text || '';
    if (rawSub) {
      fabricCanvas.add(new fabric.Textbox(rawSub, {
        fontSize: Math.round(28 * fs), fontFamily: 'Pretendard',
        fill: 'rgba(255,255,255,0.5)', left: cvW * 0.5, top: cvH * 0.88,
        originX: 'center', originY: 'top', width: cvW * 0.80, textAlign: 'center',
        ...(interactiveTextOptions as object),
        data: { fieldName: 'sub_text', isPlaceholder: false },
      }));
    }
    return;
  }

  // Content cards (basic layout)
  let contentNextY = cvH * 0.13;
  const rawHeadlineContent = cardData.text?.headline || '';
  if (rawHeadlineContent) {
    const headline = new fabric.Textbox(stripHighlightMarkers(rawHeadlineContent), {
      fontSize: Math.round(42 * fs), fontWeight: 'bold',
      fontFamily: cardData.style?.font?.headline_family || 'Pretendard',
      fill: '#FFFFFF', left: cvW * 0.10, top: contentNextY,
      originX: 'left', originY: 'top', width: cvW * 0.80, textAlign: 'left', lineHeight: 1.6,
      ...(interactiveTextOptions as object),
      data: { fieldName: 'headline', isPlaceholder: false },
    });
    fabricCanvas.add(headline);
    headline.initDimensions();
    contentNextY = headline.top! + headline.getScaledHeight() + Math.round(40 * fs);
  }
  const rawBodyContent = cardData.text?.body || '';
  if (rawBodyContent) {
    fabricCanvas.add(new fabric.Textbox(stripHighlightMarkers(rawBodyContent), {
      fontSize: Math.round(38 * fs), fontFamily: cardData.style?.font?.body_family || 'Pretendard',
      fill: '#FFFFFF', left: cvW * 0.10, top: contentNextY,
      originX: 'left', originY: 'top', width: cvW * 0.80, textAlign: 'left', lineHeight: 1.8,
      ...(interactiveTextOptions as object),
      data: { fieldName: 'body', isPlaceholder: false },
    }));
  }
  const rawSubContent = cardData.text?.sub_text || '';
  if (rawSubContent) {
    fabricCanvas.add(new fabric.Textbox(rawSubContent, {
      fontSize: Math.round(28 * fs), fontFamily: 'Pretendard',
      fill: 'rgba(255,255,255,0.5)', left: cvW * 0.10, top: cvH * 0.80,
      originX: 'left', originY: 'top', width: cvW * 0.80, textAlign: 'left',
      ...(interactiveTextOptions as object),
      data: { fieldName: 'sub_text', isPlaceholder: false },
    }));
  }
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

const CardCanvasClient = React.forwardRef<unknown, CardCanvasClientProps>(
  ({ card, cardIndex: _cardIndex, selectedTextIndex: _selectedTextIndex, onTextClick }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fabricCanvasRef = useRef<import('fabric').Canvas | null>(null);
    const initGuardRef = useRef(false);
    const onTextClickRef = useRef(onTextClick);
    const [isLoading, setIsLoading] = useState(true);
    const containerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);
    const bgCacheRef = useRef<Map<string, import('fabric').Image>>(new Map());

    const updateCardText = useCardStore((state) => state.updateCardText);
    const canvasRatio = useCardStore((state) => state.canvasRatio);
    const ratioConfig = CANVAS_RATIOS[canvasRatio] || CANVAS_RATIOS['1:1'];
    const canvasWidth = ratioConfig.width;
    const canvasHeight = ratioConfig.height;

    useImperativeHandle(ref, () => ({
      getCanvas: () => fabricCanvasRef.current,
      getCanvasForExport: async (): Promise<string | null> => {
        const fabricCanvas = fabricCanvasRef.current;
        if (!fabricCanvas) return null;
        const placeholders = fabricCanvas.getObjects().filter(
          (obj) => (obj as import('fabric').Textbox & { data?: { isPlaceholder?: boolean } }).data?.isPlaceholder === true
        );
        placeholders.forEach((obj) => obj.set('visible', false));
        fabricCanvas.renderAll();
        const dataUrl = fabricCanvas.toDataURL({ format: 'png', multiplier: 2 });
        placeholders.forEach((obj) => obj.set('visible', true));
        fabricCanvas.renderAll();
        return dataUrl;
      },
    }));

    useEffect(() => {
      onTextClickRef.current = onTextClick;
    }, [onTextClick]);

    // =========================================================================
    // renderContent: clear + repopulate canvas objects
    // =========================================================================

    const renderContent = useCallback(
      async (
        fabricCanvas: import('fabric').Canvas,
        cardData: Card,
        cvW: number,
        cvH: number
      ) => {
        const fabric = await import('fabric');

        fabricCanvas.getObjects().slice().forEach((obj) => fabricCanvas.remove(obj));

        const template = getTemplateForRole(cardData.role || 'content', cardData.content_layout);

        fabricCanvas.backgroundColor =
          cardData.style?.color_palette?.background || template.background.solid_fallback;

        const overlayOpacity =
          cardData.background?.overlay_opacity != null
            ? cardData.background.overlay_opacity
            : template.background.overlay_opacity;

        if (cardData.background?.src && cardData.background.type === 'image') {
          try {
            const src = cardData.background.src!;
            let img = bgCacheRef.current.get(src);
            if (!img) {
              img = await fabric.Image.fromURL(src, { crossOrigin: 'anonymous' });
              bgCacheRef.current.set(src, img);
            }
            const cloned = await img.clone();
            const isEndCard = cardData.role === 'end';
            const imgAreaH = isEndCard ? cvH * 0.45 : cvH;
            const scaleVal = Math.max(cvW / (cloned.width || 1), imgAreaH / (cloned.height || 1));
            cloned.scale(scaleVal);
            cloned.set({
              left: cvW / 2, top: imgAreaH / 2,
              originX: 'center', originY: 'center',
              selectable: false, evented: false,
            });
            fabricCanvas.add(cloned);
            fabricCanvas.sendObjectToBack(cloned);
            fabricCanvas.add(new fabric.Rect({
              left: 0, top: 0, width: cvW, height: imgAreaH,
              fill: `rgba(0,0,0,${overlayOpacity})`, selectable: false, evented: false,
            }));
          } catch (error) {
            console.warn('[CardCanvas] Failed to load background image:', error);
          }
        }

        const bgColor = cardData.style?.color_palette?.background || template.background.solid_fallback;
        const isLongBlackTemplate = (() => {
          if (bgColor === '#2A2A2E' || bgColor === '#333338') return true;
          const hex = bgColor.replace('#', '');
          if (hex.length === 6) {
            const r = parseInt(hex.slice(0, 2), 16);
            const g = parseInt(hex.slice(2, 4), 16);
            const b = parseInt(hex.slice(4, 6), 16);
            return (r * 299 + g * 587 + b * 114) / 1000 < 60;
          }
          return false;
        })();

        const hasImageBg = !!(cardData.background?.src && cardData.background.type === 'image');

        const interactiveTextOptions = {
          selectable: true, evented: true, editable: true,
          lockMovementX: false, lockMovementY: false,
          hasControls: true, hasBorders: true,
          hoverCursor: 'move',
          borderColor: SELECTION_COLOR, cornerColor: SELECTION_COLOR,
          cornerStyle: 'circle' as const, cornerSize: 10, transparentCorners: false,
        };

        if (isLongBlackTemplate) {
          renderLongBlackCard(fabricCanvas, cardData, cvW, cvH, interactiveTextOptions, fabric);
          fabricCanvas.renderAll();
          return;
        }

        const isLightBg = (() => {
          if (hasImageBg) return false;
          const hex = bgColor.replace('#', '');
          if (hex.length !== 6) return true;
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

        const userLayout = cardData.style?.layout;
        const positionConfig = userLayout ? LAYOUT_POSITIONS[userLayout] : null;
        const PLACEHOLDER_FILL = '#AAAAAA';
        const PLACEHOLDER_TEXTS: Record<string, string> = {
          headline: '제목을 입력하세요',
          body: '본문을 입력하세요',
          sub_text: '부제를 입력하세요',
        };

        const isMemoLayout = cardData.role === 'content' && cardData.content_layout === 'memo';

        // ── Headline ──
        {
          const tmpl = template.headline;
          const rawText = cardData.text?.headline;
          const isPlaceholder = !rawText;
          const displayText = isPlaceholder
            ? PLACEHOLDER_TEXTS.headline
            : stripHighlightMarkers(rawText!);

          const baseFontSize = cardData.style?.font?.headline_size ?? tmpl.fontSize;
          const fontSize = Math.min(Math.round(baseFontSize), 64);

          let left: number, top: number, originX: string, textAlign: string, textWidth: number;
          if (positionConfig) {
            left = cvW * positionConfig.left;
            const baseY = cvH * positionConfig.top;
            top = clampTop(baseY, -40, fontSize * 1.4, cvH);
            originX = positionConfig.originX;
            textAlign = positionConfig.textAlign;
            textWidth = cvW * positionConfig.widthRatio;
          } else {
            left = cvW * tmpl.left; top = cvH * tmpl.top;
            originX = tmpl.originX; textAlign = tmpl.textAlign; textWidth = cvW * tmpl.width;
          }

          const headlineFill = isPlaceholder
            ? PLACEHOLDER_FILL
            : resolveTextColor(tmpl.fill, cardData.style?.color_palette?.text);

          fabricCanvas.add(new fabric.Textbox(displayText, {
            fontSize: Math.min(fontSize, 48),
            fontStyle: isPlaceholder ? 'italic' : 'normal',
            fontFamily: cardData.style?.font?.headline_family || 'Pretendard',
            fill: headlineFill, left, top,
            originX: originX as 'left' | 'center' | 'right',
            originY: 'top', width: textWidth,
            textAlign: textAlign as 'left' | 'center' | 'right',
            ...interactiveTextOptions,
            data: { fieldName: 'headline', isPlaceholder },
          }));
        }

        // ── Body ──
        if (cardData.text !== undefined && 'body' in (cardData.text || {})) {
          const tmpl = template.body;
          const rawText = cardData.text?.body;
          const isPlaceholder = !rawText;
          const displayText = isPlaceholder ? PLACEHOLDER_TEXTS.body : stripHighlightMarkers(rawText!);

          const baseFontSize = cardData.style?.font?.body_size ?? tmpl.fontSize;
          const fontSize = Math.round(baseFontSize);
          const lineHeight = tmpl.lineHeight;

          let left: number, top: number, originX: string, textAlign: string, textWidth: number;
          if (positionConfig) {
            left = cvW * positionConfig.left;
            const baseY = cvH * positionConfig.top;
            top = clampTop(baseY, 60, fontSize * 2.8, cvH);
            originX = positionConfig.originX;
            textAlign = positionConfig.textAlign;
            textWidth = isMemoLayout ? cvW * 0.76 : cvW * positionConfig.widthRatio;
          } else {
            left = cvW * tmpl.left; top = cvH * tmpl.top;
            originX = tmpl.originX; textAlign = tmpl.textAlign;
            textWidth = isMemoLayout ? cvW * 0.76 : cvW * tmpl.width;
          }

          const bodyFill = isPlaceholder
            ? PLACEHOLDER_FILL
            : resolveTextColor(tmpl.fill, cardData.style?.color_palette?.text);

          fabricCanvas.add(new fabric.Textbox(displayText, {
            fontSize, fontStyle: isPlaceholder ? 'italic' : 'normal',
            fontFamily: cardData.style?.font?.body_family || 'Pretendard',
            fill: bodyFill, left, top,
            originX: originX as 'left' | 'center' | 'right',
            originY: 'top', width: textWidth,
            textAlign: textAlign as 'left' | 'center' | 'right',
            lineHeight, ...interactiveTextOptions,
            data: { fieldName: 'body', isPlaceholder },
          }));
        }

        // ── Sub-text ──
        if (cardData.text !== undefined && 'sub_text' in (cardData.text || {})) {
          const subRawText = cardData.text?.sub_text;
          const subIsPlaceholder = !subRawText;
          const subDisplayText = subIsPlaceholder ? PLACEHOLDER_TEXTS.sub_text : subRawText!;
          const subFontSize = Math.max(Math.round(template.sub_text.fontSize || 20), 20);

          let subLeft: number, subTop: number, subOriginX: string, subTextAlign: string, subTextWidth: number;
          if (positionConfig) {
            subLeft = cvW * positionConfig.left;
            const baseY = cvH * positionConfig.top;
            subTop = clampTop(baseY, 120, subFontSize * 1.4, cvH);
            subOriginX = positionConfig.originX;
            subTextAlign = positionConfig.textAlign;
            subTextWidth = cvW * positionConfig.widthRatio;
          } else {
            subLeft = cvW * template.sub_text.left; subTop = cvH * template.sub_text.top;
            subOriginX = template.sub_text.originX; subTextAlign = template.sub_text.textAlign;
            subTextWidth = cvW * template.sub_text.width;
          }

          fabricCanvas.add(new fabric.Textbox(subDisplayText, {
            fontSize: subFontSize, fontFamily: 'Pretendard',
            fill: subIsPlaceholder
              ? PLACEHOLDER_FILL
              : resolveTextColor(undefined, cardData.style?.color_palette?.secondary),
            left: subLeft, top: subTop,
            originX: subOriginX as 'left' | 'center' | 'right',
            originY: 'top', width: subTextWidth,
            textAlign: subTextAlign as 'left' | 'center' | 'right',
            ...interactiveTextOptions,
            data: { fieldName: 'sub_text', isPlaceholder: subIsPlaceholder },
          }));
        }

        // ── Content blocks ──
        const accentColor = cardData.style?.color_palette?.primary || template.body.fill || '#4F90FF';
        const blockFontFamily = cardData.style?.font?.body_family || 'Pretendard';
        const blockTextColor = resolveTextColor(template.body.fill, cardData.style?.color_palette?.text);
        const blockLeft = positionConfig
          ? (positionConfig.originX === 'left' ? cvW * positionConfig.left : cvW * 0.1)
          : cvW * 0.1;
        const blockWidth = cvW * 0.78;
        const layoutTop = positionConfig ? cvH * positionConfig.top : cvH * 0.45;
        const lastFieldOffset = cardData.text?.sub_text !== undefined ? 180 : 120;
        let blockTop = layoutTop + lastFieldOffset;
        const BLOCK_GAP = 24;

        if (cardData.text?.description) {
          const descBlock = createDescriptionBlock(cardData.text.description, {
            left: blockLeft, top: blockTop, width: blockWidth, fill: blockTextColor,
            fontFamily: blockFontFamily,
            fontSize: Math.round(template.body.fontSize * 0.82), accentColor,
          });
          fabricCanvas.add(descBlock);
          blockTop += descBlock.height + BLOCK_GAP;
        }

        if (cardData.text?.quote) {
          const quoteBlock = createQuoteBlock(cardData.text.quote, {
            left: blockLeft, top: blockTop, width: blockWidth, fill: blockTextColor,
            fontFamily: blockFontFamily,
            fontSize: Math.round(template.body.fontSize * 0.85), accentColor,
          });
          fabricCanvas.add(quoteBlock);
          blockTop += quoteBlock.height + BLOCK_GAP;
        }

        if (cardData.text?.bullet_points && cardData.text.bullet_points.length > 0) {
          const bulletBlock = createBulletListBlock(cardData.text.bullet_points, {
            left: blockLeft, top: blockTop, width: blockWidth, fill: blockTextColor,
            fontFamily: blockFontFamily,
            fontSize: Math.round(template.body.fontSize * 0.82), accentColor,
          });
          fabricCanvas.add(bulletBlock);
        }

        fabricCanvas.renderAll();
      },
      []
    );

    // =========================================================================
    // Initialize canvas ONCE — ref-guard prevents double-init in React 19 strict mode
    // =========================================================================

    useEffect(() => {
      if (initGuardRef.current) return;
      if (!canvasRef.current) return;
      initGuardRef.current = true;

      let fabricCanvas: import('fabric').Canvas;

      const init = async () => {
        const fabric = await import('fabric');
        // Dispose any existing canvas on the same element (React 19 strict mode remount)
        if (fabricCanvasRef.current) {
          fabricCanvasRef.current.dispose();
          fabricCanvasRef.current = null;
        }
        fabricCanvas = new fabric.Canvas(canvasRef.current!, {
          width: canvasWidth,
          height: canvasHeight,
          backgroundColor: '#F0F4F8',
        });
        fabricCanvasRef.current = fabricCanvas;

        const PLACEHOLDER_TEXTS: Record<string, string> = {
          headline: '제목을 입력하세요',
          body: '본문을 입력하세요',
          sub_text: '부제를 입력하세요',
        };

        fabricCanvas.on('mouse:dblclick', (e) => {
          const target = e.target as import('fabric').Textbox & {
            data?: { fieldName?: string; isPlaceholder?: boolean };
          };
          if (target && target.data?.fieldName) {
            onTextClickRef.current?.(target.data.fieldName);
            if (target.data.isPlaceholder) target.selectAll();
          }
        });

        fabricCanvas.on('text:changed', (e) => {
          const target = e.target as import('fabric').Textbox & {
            data?: { fieldName?: string; isPlaceholder?: boolean };
          };
          if (target && target.data?.fieldName) {
            const fieldName = target.data.fieldName as 'headline' | 'body' | 'sub_text';
            let newText = target.text || '';
            if (newText === PLACEHOLDER_TEXTS[fieldName]) newText = '';
            const currentIndex = useCardStore.getState().selectedCardIndex;
            useCardStore.getState().updateCardText(currentIndex, fieldName, newText).catch((err) => {
              console.warn('[CardCanvas] Failed to sync inline text edit:', err);
            });
          }
        });

        fabricCanvas.on('text:editing:exited', (e) => {
          const target = e.target as import('fabric').Textbox & {
            data?: { fieldName?: string; isPlaceholder?: boolean };
          };
          if (target && target.data?.fieldName) {
            const fieldName = target.data.fieldName as 'headline' | 'body' | 'sub_text';
            const currentText = target.text || '';
            if (!currentText || currentText === PLACEHOLDER_TEXTS[fieldName]) {
              const currentIndex = useCardStore.getState().selectedCardIndex;
              useCardStore.getState().updateCardText(currentIndex, fieldName, '').catch((err) => {
                console.warn('[CardCanvas] Failed to clear text on edit exit:', err);
              });
            }
          }
        });

        setIsLoading(false);

        // Render the initial card right after canvas init to avoid race condition
        // where the card render effect fires before the canvas is ready.
        if (card) {
          await renderContent(fabricCanvas, card, canvasWidth, canvasHeight);
        }
      };

      init().catch(console.error);

      return () => {
        if (fabricCanvas) {
          fabricCanvas.dispose();
          fabricCanvasRef.current = null;
          bgCacheRef.current.clear();
        }
        initGuardRef.current = false;
      };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // =========================================================================
    // Update canvas when card data or ratio changes
    // =========================================================================

    useEffect(() => {
      const fabricCanvas = fabricCanvasRef.current;
      if (!fabricCanvas || !card) return;

      if (fabricCanvas.width !== canvasWidth || fabricCanvas.height !== canvasHeight) {
        fabricCanvas.setDimensions({ width: canvasWidth, height: canvasHeight });
      }

      renderContent(fabricCanvas, card, canvasWidth, canvasHeight).then(() => {
        if (document.fonts?.ready) {
          document.fonts.ready.then(() => {
            import('fabric').then(({ Textbox, Text }) => {
              fabricCanvas.getObjects().forEach((obj) => {
                if (obj instanceof Textbox || obj instanceof Text) obj.initDimensions();
              });
              fabricCanvas.renderAll();
            });
          });
        }
      });
    }, [card, canvasWidth, canvasHeight, renderContent]);

    // =========================================================================
    // Scale canvas to fit container via CSS transform
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
