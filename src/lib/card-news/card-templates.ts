/**
 * Card Role Templates
 * Defines default layout and typography for each card role.
 *
 * All position values (top, left, width) are fractions of canvas size (0–1).
 * originX/originY default to 'center' for all templates.
 */

import type { CardRole, ContentLayout } from '@/lib/card-news/types';

// ============================================================================
// Template Types
// ============================================================================

export interface TextFieldTemplate {
  fontSize: number;
  fontWeight: 'bold' | 'regular';
  top: number;       // 0–1 ratio of canvas height
  left: number;      // 0–1 ratio of canvas width
  width: number;     // 0–1 ratio of canvas width
  textAlign: 'left' | 'center' | 'right';
  originX: 'left' | 'center' | 'right';
  originY: 'top' | 'center' | 'bottom';
  lineHeight?: number;
  letterSpacing?: number;
  fill?: string;     // template default fill (overridden by user palette)
}

export interface BackgroundTemplate {
  overlay_opacity: number;
  recommended_type: 'image' | 'solid' | 'gradient';
  solid_fallback: string;
}

export interface CardTemplate {
  role: CardRole;
  content_layout?: ContentLayout;
  variant?: 'A' | 'B' | 'C';
  headline: TextFieldTemplate;
  body: TextFieldTemplate;
  sub_text: TextFieldTemplate;
  background: BackgroundTemplate;
}

// ============================================================================
// Role Templates
// ============================================================================

const TEMPLATES: Record<CardRole, CardTemplate> = {
  // --------------------------------------------------------------------------
  // Cover — 강렬한 시각적 훅, 대형 헤드라인
  // --------------------------------------------------------------------------
  cover: {
    role: 'cover',
    headline: {
      fontSize: 80,
      fontWeight: 'bold',
      top: 0.48,
      left: 0.5,
      width: 0.80,
      textAlign: 'center',
      originX: 'center',
      originY: 'center',
      lineHeight: 1.3,
      fill: '#FFFFFF',
    },
    body: {
      fontSize: 32,
      fontWeight: 'regular',
      top: 0.60,
      left: 0.5,
      width: 0.70,
      textAlign: 'center',
      originX: 'center',
      originY: 'center',
      fill: 'rgba(255,255,255,0.85)',
    },
    sub_text: {
      fontSize: 24,
      fontWeight: 'regular',
      top: 0.88,
      left: 0.5,
      width: 0.60,
      textAlign: 'center',
      originX: 'center',
      originY: 'center',
      fill: 'rgba(255,255,255,0.65)',
      letterSpacing: 2,
    },
    background: {
      overlay_opacity: 0.55,
      recommended_type: 'image',
      solid_fallback: '#1A1A2E',
    },
  },

  // --------------------------------------------------------------------------
  // Content — 서술형 본문 카드 (basic layout 기본값)
  // --------------------------------------------------------------------------
  content: {
    role: 'content',
    content_layout: 'basic',
    variant: 'A',
    headline: {
      fontSize: 48,
      fontWeight: 'bold',
      top: 0.14,
      left: 0.5,
      width: 0.82,
      textAlign: 'center',
      originX: 'center',
      originY: 'center',
      fill: '#1A1A2E',
    },
    body: {
      fontSize: 38,
      fontWeight: 'regular',
      top: 0.52,
      left: 0.5,
      width: 0.78,
      textAlign: 'left',
      originX: 'center',
      originY: 'center',
      lineHeight: 1.75,
      fill: '#333333',
    },
    sub_text: {
      fontSize: 28,
      fontWeight: 'regular',
      top: 0.87,
      left: 0.5,
      width: 0.70,
      textAlign: 'center',
      originX: 'center',
      originY: 'center',
      fill: '#777777',
    },
    background: {
      overlay_opacity: 0.20,
      recommended_type: 'solid',
      solid_fallback: '#F0F4F8',
    },
  },

  // --------------------------------------------------------------------------
  // End — 마무리/CTA, 감성적 행동 유도
  // --------------------------------------------------------------------------
  end: {
    role: 'end',
    headline: {
      fontSize: 48,
      fontWeight: 'bold',
      top: 0.30,
      left: 0.5,
      width: 0.78,
      textAlign: 'center',
      originX: 'center',
      originY: 'center',
      lineHeight: 1.35,
      fill: '#FFFFFF',
    },
    body: {
      fontSize: 32,
      fontWeight: 'bold',
      top: 0.56,
      left: 0.5,
      width: 0.60,
      textAlign: 'center',
      originX: 'center',
      originY: 'center',
      fill: '#FFFFFF',
    },
    sub_text: {
      fontSize: 26,
      fontWeight: 'regular',
      top: 0.74,
      left: 0.5,
      width: 0.55,
      textAlign: 'center',
      originX: 'center',
      originY: 'center',
      fill: 'rgba(255,255,255,0.80)',
      letterSpacing: 1,
    },
    background: {
      overlay_opacity: 0.60,
      recommended_type: 'solid',
      solid_fallback: '#1A3C2E',
    },
  },
};

// ============================================================================
// Public API
// ============================================================================

/** Memo layout variant for content cards (tip/checklist style) */
const MEMO_TEMPLATE: CardTemplate = {
  role: 'content',
  content_layout: 'memo',
  variant: 'C',
  headline: {
    fontSize: 44,
    fontWeight: 'bold',
    top: 0.10,
    left: 0.5,
    width: 0.82,
    textAlign: 'center',
    originX: 'center',
    originY: 'center',
    fill: '#2D2D2D',
  },
  body: {
    fontSize: 30,
    fontWeight: 'regular',
    top: 0.28,
    left: 0.5,
    width: 0.76,
    textAlign: 'left',
    originX: 'center',
    originY: 'center',
    lineHeight: 1.65,
    fill: '#333333',
  },
  sub_text: {
    fontSize: 24,
    fontWeight: 'regular',
    top: 0.92,
    left: 0.5,
    width: 0.60,
    textAlign: 'center',
    originX: 'center',
    originY: 'center',
    fill: '#999999',
  },
  background: {
    overlay_opacity: 0.10,
    recommended_type: 'solid',
    solid_fallback: '#FFFDE7',
  },
};

/**
 * Returns the default CardTemplate for a given role and optional content layout.
 * For 'content' role cards, pass contentLayout to get the memo variant if applicable.
 */
export function getTemplateForRole(role: CardRole, contentLayout?: ContentLayout): CardTemplate {
  if (role === 'content' && contentLayout === 'memo') {
    return MEMO_TEMPLATE;
  }
  return TEMPLATES[role] ?? TEMPLATES['content'];
}
