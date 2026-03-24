/**
 * Card News Validation Schemas (Zod v4)
 * Ported from canvas_editor
 */

import { z } from 'zod';
import { TEXT_LIMITS } from './constants';

// ============================================================================
// Card Text Validation
// ============================================================================

export const CardTextSchema = z.object({
  headline: z
    .string()
    .max(TEXT_LIMITS.headline, `최대 ${TEXT_LIMITS.headline}자까지 입력 가능합니다.`),
  body: z
    .string()
    .max(TEXT_LIMITS.body, `최대 ${TEXT_LIMITS.body}자까지 입력 가능합니다.`)
    .optional(),
  sub_text: z.string().optional(),
  description: z.string().max(TEXT_LIMITS.description).optional(),
  quote: z.string().max(TEXT_LIMITS.quote).optional(),
  bullet_points: z.array(z.string().max(TEXT_LIMITS.bullet_point)).optional(),
});

// ============================================================================
// Color Palette Validation
// ============================================================================

const HexColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, '유효한 16진수 색상 코드여야 합니다.');

export const ColorPaletteSchema = z
  .object({
    primary: HexColorSchema.optional(),
    secondary: HexColorSchema.optional(),
    text: HexColorSchema.optional(),
    background: HexColorSchema.optional(),
  })
  .optional();

// ============================================================================
// Font Style Validation
// ============================================================================

export const FontStyleSchema = z
  .object({
    headline_family: z.string().optional(),
    headline_size: z.number().int().min(8).max(72).optional(),
    body_family: z.string().optional(),
    body_size: z.number().int().min(8).max(72).optional(),
  })
  .optional();

// ============================================================================
// Card Style Validation
// ============================================================================

export const CardStyleSchema = z
  .object({
    layout: z
      .enum(['center', 'top-left', 'top-right', 'bottom-left', 'bottom-right', 'split'])
      .optional(),
    color_palette: ColorPaletteSchema,
    font: FontStyleSchema,
  })
  .optional();

// ============================================================================
// Card Background Validation
// ============================================================================

export const CardBackgroundSchema = z
  .object({
    type: z.enum(['image', 'gradient', 'solid']).optional(),
    src: z.string().url().nullable().optional(),
    prompt: z.string().nullable().optional(),
    overlay_opacity: z.number().min(0).max(1).optional(),
  })
  .optional();

// ============================================================================
// Card Validation (generalized roles)
// ============================================================================

export const CardSchema = z.object({
  index: z.number().int().min(0),
  role: z.enum(['cover', 'content', 'end']),
  content_layout: z.enum(['basic', 'memo']).optional(),
  text: CardTextSchema,
  style: CardStyleSchema,
  background: CardBackgroundSchema,
});

// ============================================================================
// SNS Configuration Validation
// ============================================================================

export const SnsConfigSchema = z.object({
  instagram: z
    .object({
      caption: z.string(),
      hashtags: z.array(z.string()).optional(),
    })
    .optional(),
  threads: z
    .object({
      text: z.string(),
    })
    .optional(),
});

// ============================================================================
// Card Spec Meta Validation
// ============================================================================

export const CardSpecMetaSchema = z.object({
  id: z.string().min(1),
  topic: z.string().min(1, '주제명은 필수입니다.'),
  angle: z.string().optional(),
  target_persona: z.string().optional(),
  created_at: z.string(),
  status: z.enum(['draft', 'review', 'approved', 'published']),
  sources: z.array(z.string()).optional(),
});

// ============================================================================
// Complete Card Spec Validation
// ============================================================================

export const CardSpecSchema = z.object({
  meta: CardSpecMetaSchema,
  cards: z.array(CardSchema).min(1, '최소 1개의 카드가 필요합니다.'),
  sns: SnsConfigSchema,
  canvas_ratio: z.enum(['1:1', '4:5', '9:16']).optional(),
});

// ============================================================================
// Edit Log Validation
// ============================================================================

export const EditLogSchema = z.object({
  spec_id: z.string(),
  editor: z.string(),
  field_path: z.string(),
  old_value: z.string().nullable().optional(),
  new_value: z.string(),
  change_reason: z.string().optional(),
});

// ============================================================================
// Publish Report Validation
// ============================================================================

export const PublishReportSchema = z.object({
  spec_id: z.string(),
  platform: z.enum(['instagram', 'threads']),
  post_url: z.string().url().nullable().optional(),
  post_id: z.string().nullable().optional(),
  status: z.enum(['pending', 'published', 'failed']),
  error_message: z.string().nullable().optional(),
});

// ============================================================================
// Validation Utility Functions
// ============================================================================

export function validateCardText(
  text: Record<string, unknown>,
): { valid: boolean; errors: Record<string, string> } {
  const result = CardTextSchema.safeParse(text);

  if (result.success) {
    return { valid: true, errors: {} };
  }

  const errors: Record<string, string> = {};
  result.error.issues.forEach((err) => {
    if (err.path.length > 0) {
      errors[String(err.path[0])] = err.message;
    }
  });

  return { valid: false, errors };
}

export function validateCardSpec(
  spec: unknown,
): { valid: boolean; error?: string } {
  const result = CardSpecSchema.safeParse(spec);

  if (result.success) {
    return { valid: true };
  }

  const firstError = result.error.issues[0];
  return {
    valid: false,
    error: firstError?.message || '유효하지 않은 카드 스펙입니다.',
  };
}

export function validateHeadline(text: string): {
  valid: boolean;
  message?: string;
} {
  if (text.length > TEXT_LIMITS.headline) {
    return {
      valid: false,
      message: `헤드라인은 ${TEXT_LIMITS.headline}자 이내여야 합니다. (현재 ${text.length}자)`,
    };
  }
  return { valid: true };
}

export function validateBody(text: string): {
  valid: boolean;
  message?: string;
} {
  if (text.length > TEXT_LIMITS.body) {
    return {
      valid: false,
      message: `본문은 ${TEXT_LIMITS.body}자 이내여야 합니다. (현재 ${text.length}자)`,
    };
  }
  return { valid: true };
}

export function validateHexColor(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/i.test(color);
}
