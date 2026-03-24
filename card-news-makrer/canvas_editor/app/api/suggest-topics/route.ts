/**
 * POST /api/suggest-topics
 * Returns 5 AI-generated mental health topic suggestions using Gemini.
 *
 * Implements the Researcher agent role:
 * - 계절/시기별 이슈 반영
 * - 트렌드 키워드 고려
 * - 타겟 오디언스 관심도 기반 추천
 *
 * Fallback: static topic pool when Gemini is unavailable.
 */

import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import type { TopicSuggestion } from '@/types';

// ============================================================================
// Season / Context Helpers
// ============================================================================

function getSeasonInfo(): { month: number; season: string; events: string[] } {
  const now = new Date();
  const month = now.getMonth() + 1;

  const seasonMap: Record<number, { season: string; events: string[] }> = {
    1:  { season: '겨울', events: ['신년 목표 스트레스', '겨울 우울증'] },
    2:  { season: '겨울', events: ['발렌타인데이 외로움', '학기 시작 불안'] },
    3:  { season: '봄', events: ['개학/입사 시즌', '봄철 우울감', '환절기 무기력'] },
    4:  { season: '봄', events: ['봄철 우울감', '벚꽃 시즌 FOMO'] },
    5:  { season: '봄', events: ['가정의 달 관계 스트레스', '어버이날 감정'] },
    6:  { season: '여름', events: ['시험 기간 스트레스', '여름 휴가 번아웃'] },
    7:  { season: '여름', events: ['무더위 수면장애', '여름 휴가 불안'] },
    8:  { season: '여름', events: ['개학 불안', '번아웃 회복기'] },
    9:  { season: '가을', events: ['가을 우울', '추석 가족 스트레스'] },
    10: { season: '가을', events: ['계절 변화 우울', '연말 준비 스트레스'] },
    11: { season: '가을', events: ['수능 시즌 불안', '연말 회고'] },
    12: { season: '겨울', events: ['연말 우울', '송년회 피로', '한 해 돌아보기'] },
  };

  return { month, ...(seasonMap[month] || { season: '봄', events: [] }) };
}

// ============================================================================
// Gemini AI Topic Generation (Researcher Agent Role)
// ============================================================================

// Topic categories for diversity
const TOPIC_CATEGORIES = [
  '감정 조절', '대인관계', '자기돌봄', '직장/학교 스트레스', '수면 건강',
  '불안/우울', '자존감', '마음챙김', '디지털 웰빙', '운동/신체건강',
  '가족관계', '연애/이별', '금전 스트레스', '미래 불안', '습관 만들기',
  '감사/긍정', '분노 조절', '외로움', '완벽주의', '번아웃 회복',
  '트라우마 회복', '경계 설정', '의사소통', '자기 이해', '계절 정서',
];

function buildResearcherPrompt(seasonInfo: ReturnType<typeof getSeasonInfo>): string {
  // Pick 3 random categories each time to ensure variety
  const shuffled = [...TOPIC_CATEGORIES].sort(() => Math.random() - 0.5);
  const pickedCategories = shuffled.slice(0, 3);
  const randomSeed = Math.floor(Math.random() * 10000);

  return `당신은 정신건강 카드뉴스 기획자입니다.

## 조건
- 현재: ${seasonInfo.month}월 (${seasonInfo.season})
- 시기 이슈: ${seasonInfo.events.join(', ')}
- 타겟: 20-40대 성인
- 랜덤 시드: ${randomSeed} (이 숫자를 참고해 매번 다른 관점의 주제를 제안하세요)

## 주제 구성 (5개)
다음 조건을 모두 만족하는 5개의 주제를 추천하세요:
1. 시즌 이슈 반영 주제: 1-2개
2. 다음 카테고리 중 최소 2개 포함: ${pickedCategories.join(', ')}
3. 나머지는 자유롭게 — 참신하고 흥미로운 관점을 우선하세요

## 주제 작성 가이드
- 제목은 15자 이내, 독자의 호기심을 자극하는 질문형이나 제안형
- "~하는 법", "~의 중요성" 같은 뻔한 제목은 피하세요
- 구체적인 상황이나 감정을 담은 제목을 선호합니다
  예시: "월요일 아침이 유독 힘든 이유", "혼자 있는 시간이 불안할 때"

## 응답 형식
JSON만 출력하세요:
{"topics":[{"title":"15자이내","description":"40자이내 설명","tags":["태그1","태그2","태그3"]}]}`;
}

async function generateTopicsWithGemini(): Promise<TopicSuggestion[] | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log('[suggest-topics] ENV check — GEMINI_API_KEY present:', !!apiKey, 'prefix:', apiKey?.slice(0, 12) || 'NONE');

  if (!apiKey) {
    console.error('[suggest-topics] GEMINI_API_KEY is not set in environment variables');
    return null;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const seasonInfo = getSeasonInfo();
    const prompt = buildResearcherPrompt(seasonInfo);
    console.log('[suggest-topics] Calling Gemini API with model gemini-3-flash-preview...');
    const t0 = Date.now();

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    const text = response.text ?? '';
    console.log(`[suggest-topics] Gemini responded in ${((Date.now() - t0) / 1000).toFixed(1)}s, length: ${text.length}`);

    // Extract JSON from response
    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) || text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[suggest-topics] Failed to parse JSON from Gemini response:', text.slice(0, 300));
      return null;
    }

    const jsonStr = jsonMatch[1] || jsonMatch[0];
    const parsed = JSON.parse(jsonStr) as { topics: TopicSuggestion[] };

    if (!parsed.topics || !Array.isArray(parsed.topics) || parsed.topics.length < 3) {
      console.error('[suggest-topics] Invalid topics count from Gemini:', parsed.topics?.length);
      return null;
    }

    console.log('[suggest-topics] Successfully generated', parsed.topics.length, 'topics');

    // Ensure each topic has required fields
    return parsed.topics.slice(0, 5).map((t) => ({
      title: t.title || '주제 없음',
      description: t.description || '',
      tags: Array.isArray(t.tags) ? t.tags.slice(0, 4) : [],
    }));
  } catch (error) {
    console.error('[suggest-topics] Gemini API error:', error instanceof Error ? error.message : error);
    console.error('[suggest-topics] Full error:', error);
    return null;
  }
}

// ============================================================================
// Route Handler
// ============================================================================

export async function POST(): Promise<NextResponse> {
  try {
    // Generate with Gemini AI (no fallback)
    const aiTopics = await generateTopicsWithGemini();

    if (!aiTopics) {
      return NextResponse.json(
        { error: 'AI 주제 추천에 실패했습니다. GEMINI_API_KEY를 확인하고 다시 시도해주세요.' },
        { status: 503 }
      );
    }

    return NextResponse.json({ topics: aiTopics, generated_by: 'gemini' });
  } catch (error) {
    console.error('[API] suggest-topics error:', error);
    return NextResponse.json(
      { error: 'Failed to suggest topics. Please try again.' },
      { status: 500 }
    );
  }
}
