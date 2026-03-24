/**
 * Design Template Definitions — v2.2
 *
 * Each template defines colors, typography, layout defaults,
 * and role-specific overrides that the canvas renderer uses.
 *
 * Reference: /reference/card_news_design_01~08.png (LongBlack Editorial)
 */

import type { DesignTemplate } from '@/types';

// ============================================================================
// LongBlack Editorial Template
// ============================================================================

export const LONGBLACK_EDITORIAL: DesignTemplate = {
  id: 'longblack-editorial',
  name: '에디토리얼 다크',
  description: '강렬한 다크 배경에 깔끔한 타이포그래피. 블루 액센트로 키워드를 강조합니다.',
  thumbnail: '/templates/longblack-editorial-thumb.png',
  config: {
    background: {
      type: 'solid',
      color: '#2A2A2E',
    },
    accent_color: '#4A7AFF',
    text_colors: {
      primary: '#FFFFFF',
      secondary: 'rgba(255,255,255,0.75)',
      accent: '#4A7AFF',
      muted: 'rgba(255,255,255,0.45)',
    },
    typography: {
      headline_family: 'Pretendard',
      body_family: 'Pretendard',
      headline_weight: 800,
      body_weight: 400,
    },
    layout_defaults: {
      text_align: 'left',
      padding: { x: 0.08, y: 0.10 },
      marker: {
        type: 'dot',
        color: '#4A7AFF',
        size: 14,
        position: { top: 0.08, left: 0.08 },
      },
      brand_area: {
        text: 'CardNews',
        position: 'bottom-center',
        font_family: 'serif',
        font_size: 24,
        color: 'rgba(255,255,255,0.35)',
      },
    },
    role_overrides: {
      cover: {
        text_align: 'left',
        headline_size: 72,
        body_size: 28,
        sub_text_size: 16,
        headline_top: 0.30,
        body_top: 0.60,
        line_height: 1.3,
      },
      empathy: {
        text_align: 'left',
        headline_size: 30,
        body_size: 30,
        headline_top: 0.14,
        body_top: 0.22,
        line_height: 1.8,
      },
      cause: {
        text_align: 'left',
        headline_size: 30,
        body_size: 30,
        headline_top: 0.14,
        body_top: 0.22,
        line_height: 1.8,
      },
      insight: {
        text_align: 'left',
        headline_size: 30,
        body_size: 30,
        headline_top: 0.14,
        body_top: 0.22,
        line_height: 1.8,
      },
      solution: {
        text_align: 'left',
        headline_size: 30,
        body_size: 30,
        headline_top: 0.14,
        body_top: 0.22,
        line_height: 1.8,
      },
      tip: {
        text_align: 'left',
        headline_size: 38,
        body_size: 24,
        headline_top: 0.06,
        body_top: 0.20,
        line_height: 1.6,
        has_background_box: true,
        background_box_color: '#B8D4F0',
      },
      closing: {
        text_align: 'left',
        headline_size: 30,
        body_size: 30,
        headline_top: 0.14,
        body_top: 0.22,
        line_height: 1.8,
      },
      source: {
        text_align: 'center',
        headline_size: 28,
        body_size: 18,
        headline_top: 0.12,
        body_top: 0.30,
        line_height: 2.0,
      },
      cta: {
        text_align: 'center',
        headline_size: 34,
        body_size: 22,
        sub_text_size: 18,
        headline_top: 0.55,
        body_top: 0.72,
        line_height: 1.5,
        has_image_area: true,
        image_area_height: 0.45,
      },
    },
  },
};

// ============================================================================
// Mindthos Green Template (same layout, green accent)
// ============================================================================

export const MINDTHOS_GREEN: DesignTemplate = {
  id: 'mindthos-green',
  name: '에디토리얼 그린',
  description: '다크 배경에 그린 액센트. 자연스럽고 편안한 느낌의 정신건강 카드뉴스.',
  thumbnail: '/templates/mindthos-green-thumb.png',
  config: {
    background: {
      type: 'solid',
      color: '#2A2A2E',
    },
    accent_color: '#44CE4B',
    text_colors: {
      primary: '#FFFFFF',
      secondary: 'rgba(255,255,255,0.75)',
      accent: '#44CE4B',
      muted: 'rgba(255,255,255,0.45)',
    },
    typography: {
      headline_family: 'Pretendard',
      body_family: 'Pretendard',
      headline_weight: 800,
      body_weight: 400,
    },
    layout_defaults: {
      text_align: 'left',
      padding: { x: 0.08, y: 0.10 },
      marker: {
        type: 'dot',
        color: '#44CE4B',
        size: 14,
        position: { top: 0.08, left: 0.08 },
      },
      brand_area: {
        text: '@mindthos',
        position: 'bottom-center',
        font_family: 'Georgia, serif',
        font_size: 24,
        color: 'rgba(255,255,255,0.35)',
      },
    },
    role_overrides: {
      cover: {
        text_align: 'left',
        headline_size: 72,
        body_size: 28,
        sub_text_size: 16,
        headline_top: 0.30,
        body_top: 0.60,
        line_height: 1.3,
      },
      content: {
        text_align: 'left',
        headline_size: 42,
        body_size: 38,
        headline_top: 0.13,
        body_top: 0.24,
        line_height: 1.8,
      },
      end: {
        text_align: 'center',
        headline_size: 42,
        body_size: 34,
        sub_text_size: 28,
        headline_top: 0.52,
        body_top: 0.68,
        line_height: 1.5,
        has_image_area: true,
        image_area_height: 0.45,
      },
    },
  },
};

// ============================================================================
// Template Registry
// ============================================================================

const DESIGN_TEMPLATES: DesignTemplate[] = [
  LONGBLACK_EDITORIAL,
  MINDTHOS_GREEN,
];

export function getAllDesignTemplates(): DesignTemplate[] {
  return DESIGN_TEMPLATES;
}

export function getDesignTemplate(id: string): DesignTemplate | undefined {
  return DESIGN_TEMPLATES.find((t) => t.id === id);
}

export function getDefaultDesignTemplate(): DesignTemplate {
  return LONGBLACK_EDITORIAL;
}
