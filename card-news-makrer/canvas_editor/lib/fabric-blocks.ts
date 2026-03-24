/**
 * Fabric.js Content Block Renderers
 * Creates styled Fabric.js Group objects for quote, bullet list, and description blocks.
 *
 * All returned Groups are interactive (selectable, movable) and match the
 * interactiveTextOptions convention used in CardCanvasClient.tsx.
 */

import * as fabric from 'fabric';

export interface BlockOptions {
  left: number;
  top: number;
  width: number;
  fill: string;
  fontFamily: string;
  fontSize: number;
  accentColor: string; // decoration element color
}

// Selection style — matches CardCanvasClient.tsx constants
const SELECTION_COLOR = '#4F90FF';

const interactiveGroupOptions = {
  selectable: true,
  evented: true,
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

// ============================================================================
// Quote Block
// ============================================================================

/**
 * 인용문 블록: 좌측 4px 세로 줄 + 이탤릭 텍스트
 * │ "인용문 텍스트..."
 */
export function createQuoteBlock(text: string, options: BlockOptions): fabric.Group {
  const BAR_WIDTH = 4;
  const BAR_HEIGHT = Math.max(60, options.fontSize * 3.2);
  const TEXT_OFFSET = 16; // gap between bar and text

  const bar = new fabric.Rect({
    left: 0,
    top: 0,
    width: BAR_WIDTH,
    height: BAR_HEIGHT,
    fill: options.accentColor,
    selectable: false,
    evented: false,
  });

  const textObj = new fabric.IText(text, {
    left: BAR_WIDTH + TEXT_OFFSET,
    top: 0,
    width: options.width - BAR_WIDTH - TEXT_OFFSET,
    fontSize: options.fontSize,
    fontFamily: options.fontFamily,
    fontStyle: 'italic',
    fill: options.fill,
    lineHeight: 1.6,
    textAlign: 'left',
    originX: 'left',
    originY: 'top',
    editable: true,
    selectable: false,
    evented: false,
  });

  const group = new fabric.Group([bar, textObj], {
    left: options.left,
    top: options.top,
    originX: 'left',
    originY: 'top',
    ...interactiveGroupOptions,
    data: { fieldName: 'quote' },
  });

  return group;
}

// ============================================================================
// Bullet List Block
// ============================================================================

/**
 * 불릿 목록 블록: 원형 마커 + 들여쓰기 텍스트
 * • 항목 1
 * • 항목 2
 */
export function createBulletListBlock(items: string[], options: BlockOptions): fabric.Group {
  const MARKER_RADIUS = 5;
  const MARKER_DIAMETER = MARKER_RADIUS * 2;
  const TEXT_OFFSET = 12; // gap between marker right edge and text
  const ITEM_GAP = 8;     // vertical gap between items
  const LINE_HEIGHT = 1.5;

  const objects: fabric.Object[] = [];
  let currentTop = 0;

  for (const item of items) {
    const markerTop = currentTop + options.fontSize * LINE_HEIGHT * 0.3; // vertically center marker to first line

    const marker = new fabric.Circle({
      left: 0,
      top: markerTop,
      radius: MARKER_RADIUS,
      fill: options.accentColor,
      originX: 'left',
      originY: 'top',
      selectable: false,
      evented: false,
    });

    const textObj = new fabric.IText(item, {
      left: MARKER_DIAMETER + TEXT_OFFSET,
      top: currentTop,
      width: options.width - MARKER_DIAMETER - TEXT_OFFSET,
      fontSize: options.fontSize,
      fontFamily: options.fontFamily,
      fill: options.fill,
      lineHeight: LINE_HEIGHT,
      textAlign: 'left',
      originX: 'left',
      originY: 'top',
      editable: true,
      selectable: false,
      evented: false,
    });

    objects.push(marker, textObj);

    // Approximate height of this item: single line height
    const itemHeight = options.fontSize * LINE_HEIGHT;
    currentTop += itemHeight + ITEM_GAP;
  }

  const group = new fabric.Group(objects, {
    left: options.left,
    top: options.top,
    originX: 'left',
    originY: 'top',
    ...interactiveGroupOptions,
    data: { fieldName: 'bullet_points' },
  });

  return group;
}

// ============================================================================
// Description Block
// ============================================================================

/**
 * 설명 블록: 긴 텍스트를 적절한 줄바꿈으로 렌더링
 */
export function createDescriptionBlock(text: string, options: BlockOptions): fabric.Group {
  const textObj = new fabric.IText(text, {
    left: 0,
    top: 0,
    width: options.width,
    fontSize: options.fontSize,
    fontFamily: options.fontFamily,
    fill: options.fill,
    lineHeight: 1.6,
    textAlign: 'left',
    originX: 'left',
    originY: 'top',
    editable: true,
    selectable: false,
    evented: false,
  });

  const group = new fabric.Group([textObj], {
    left: options.left,
    top: options.top,
    originX: 'left',
    originY: 'top',
    ...interactiveGroupOptions,
    data: { fieldName: 'description' },
  });

  return group;
}
