/**
 * Zod Schemas for Data Validation
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
});

export type CardText = z.infer<typeof CardTextSchema>;

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
// Card Validation
// ============================================================================

export const CardSchema = z.object({
  index: z.number().int().min(1),
  role: z.enum([
    'cover',
    'empathy',
    'cause',
    'insight',
    'solution',
    'tip',
    'closing',
    'source',
    'cta',
  ]),
  text: CardTextSchema,
  style: CardStyleSchema,
  background: CardBackgroundSchema,
});

export type Card = z.infer<typeof CardSchema>;

// ============================================================================
// SNS Configuration Validation
// ============================================================================

export const SnsInstagramSchema = z
  .object({
    caption: z.string(),
    hashtags: z.array(z.string()).optional(),
  })
  .optional();

export const SnsThreadsSchema = z
  .object({
    text: z.string(),
  })
  .optional();

export const SnsConfigSchema = z.object({
  instagram: SnsInstagramSchema,
  threads: SnsThreadsSchema,
});

export type SnsConfig = z.infer<typeof SnsConfigSchema>;

// ============================================================================
// Card Spec Meta Validation
// ============================================================================

export const CardSpecMetaSchema = z.object({
  id: z.string().regex(/^\d{4}-\d{2}-\d{2}-\d{3}$/, '유효한 ID 형식이 아닙니다.'),
  topic: z.string().min(1, '주제명은 필수입니다.'),
  angle: z.string().optional(),
  target_persona: z.string().optional(),
  created_at: z.string().datetime(),
  status: z.enum(['draft', 'review', 'approved', 'published']),
  sources: z.array(z.string().url()).optional(),
});

export type CardSpecMeta = z.infer<typeof CardSpecMetaSchema>;

// ============================================================================
// Complete Card Spec Validation
// ============================================================================

export const CardSpecSchema = z.object({
  meta: CardSpecMetaSchema,
  cards: z
    .array(CardSchema)
    .min(6, '최소 6개의 카드가 필요합니다.')
    .max(10, '최대 10개의 카드까지 가능합니다.'),
  sns: SnsConfigSchema,
});

export type CardSpec = z.infer<typeof CardSpecSchema>;

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

export type EditLog = z.infer<typeof EditLogSchema>;

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

export type PublishReport = z.infer<typeof PublishReportSchema>;

// ============================================================================
// Validation Utility Functions
// ============================================================================

/**
 * Validate card text and return errors
 */
export function validateCardText(
  text: any
): { valid: boolean; errors: Record<string, string> } {
  const result = CardTextSchema.safeParse(text);

  if (result.success) {
    return { valid: true, errors: {} };
  }

  const errors: Record<string, string> = {};
  result.error.errors.forEach((err) => {
    if (err.path.length > 0) {
      errors[String(err.path[0])] = err.message;
    }
  });

  return { valid: false, errors };
}

/**
 * Validate complete card spec
 */
export function validateCardSpec(spec: any): { valid: boolean; error?: string } {
  const result = CardSpecSchema.safeParse(spec);

  if (result.success) {
    return { valid: true };
  }

  const firstError = result.error.errors[0];
  return {
    valid: false,
    error: firstError?.message || '유효하지 않은 카드 스펙입니다.',
  };
}

/**
 * Validate headline length
 */
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

/**
 * Validate body text length
 */
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

/**
 * Validate hex color
 */
export function validateHexColor(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/i.test(color);
}
