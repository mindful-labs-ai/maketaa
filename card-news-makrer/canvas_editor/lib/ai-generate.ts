/**
 * AI Generation Client
 * Client-side functions that call the AI generation API routes
 */

import type { TopicSuggestion, TopicSelection, PurposeConfig, CardSpec } from '@/types';

// ============================================================================
// Topic Suggestions
// ============================================================================

/**
 * Suggest 5 mental health topics via AI
 * POST /api/suggest-topics
 */
export async function suggestTopics(): Promise<TopicSuggestion[]> {
  const response = await fetch('/api/suggest-topics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Failed to suggest topics: ${response.status}`);
  }

  const data = await response.json();
  return data.topics as TopicSuggestion[];
}

// ============================================================================
// Card News Generation
// ============================================================================

export interface GenerateCardNewsParams {
  topic: TopicSelection;
  purpose: PurposeConfig;
  templateId: string;
  cardCount?: number;
  canvasRatio?: '1:1' | '4:5' | '9:16';
}

/**
 * Generate a full card news spec from wizard selections
 * POST /api/generate-card-news
 */
export async function generateCardNews(
  params: GenerateCardNewsParams
): Promise<{ spec: CardSpec; id: string }> {
  const response = await fetch('/api/generate-card-news', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topic: params.topic,
      purpose: params.purpose,
      template_id: params.templateId,
      card_count: params.cardCount,
      canvas_ratio: params.canvasRatio,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Failed to generate card news: ${response.status}`);
  }

  const data = await response.json();
  return { spec: data.spec as CardSpec, id: data.id as string };
}
