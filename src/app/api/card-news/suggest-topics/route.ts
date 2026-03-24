/**
 * POST /api/card-news/suggest-topics
 * Returns AI-generated topic suggestions using Gemini
 * Ported from canvas_editor - generalized for any topic domain
 */

import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import type { TopicSuggestion } from '@/lib/card-news/types';

// ============================================================================
// Season/Context Helpers
// ============================================================================

function getSeasonInfo(): { month: number; season: string; events: string[] } {
  const now = new Date();
  const month = now.getMonth() + 1;

  const seasonMap: Record<number, { season: string; events: string[] }> = {
    1:  { season: '겨울', events: ['신년 목표', '겨울 시즌 콘텐츠'] },
    2:  { season: '겨울', events: ['발렌타인데이', '봄 준비'] },
    3:  { season: '봄', events: ['봄 시즌', '새학기/입사'] },
    4:  { season: '봄', events: ['봄철 이벤트', '아웃도어'] },
    5:  { season: '봄', events: ['가정의 달', '어버이날'] },
    6:  { season: '여름', events: ['여름 시즌', '휴가 준비'] },
    7:  { season: '여름', events: ['무더위 시즌', '여름 휴가'] },
    8:  { season: '여름', events: ['개학 시즌', '가을 준비'] },
    9:  { season: '가을', events: ['가을 시즌', '추석'] },
    10: { season: '가을', events: ['할로윈', '연말 준비'] },
    11: { season: '가을', events: ['블랙프라이데이', '연말 시즌'] },
    12: { season: '겨울', events: ['크리스마스', '연말 결산'] },
  };

  return { month, ...(seasonMap[month] || { season: '봄', events: [] }) };
}

// ============================================================================
// Gemini Topic Generation
// ============================================================================

const TOPIC_CATEGORIES = [
  '마케팅 팁', '브랜딩', '소셜미디어', '자기계발', '라이프스타일',
  '건강/웰빙', '테크/IT', '트렌드', '비즈니스', '크리에이티브',
  '교육', '환경/지속가능성', '음식/요리', '여행', '재테크',
  '인간관계', '문화/예술', '스포츠', '뷰티/패션', '시사/이슈',
];

function buildResearcherPrompt(seasonInfo: ReturnType<typeof getSeasonInfo>): string {
  const shuffled = [...TOPIC_CATEGORIES].sort(() => Math.random() - 0.5);
  const pickedCategories = shuffled.slice(0, 3);
  const randomSeed = Math.floor(Math.random() * 10000);

  return `당신은 카드뉴스 기획자입니다.

## 조건
- 현재: ${seasonInfo.month}월 (${seasonInfo.season})
- 시기 이슈: ${seasonInfo.events.join(', ')}
- 타겟: 20-40대 성인
- 랜덤 시드: ${randomSeed}

## 주제 구성 (5개)
1. 시즌 이슈 반영: 1-2개
2. 다음 카테고리 중 최소 2개 포함: ${pickedCategories.join(', ')}
3. 나머지는 참신하고 흥미로운 관점

## 주제 작성 가이드
- 제목은 15자 이내, 독자의 호기심을 자극
- 구체적인 상황이나 감정을 담은 제목 선호

## 응답 형식
JSON만 출력:
{"topics":[{"title":"15자이내","description":"40자이내 설명","tags":["태그1","태그2","태그3"]}]}`;
}

async function generateTopicsWithGemini(): Promise<TopicSuggestion[] | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const seasonInfo = getSeasonInfo();
    const prompt = buildResearcherPrompt(seasonInfo);

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const text = response.text ?? '';
    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) || text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const jsonStr = jsonMatch[1] || jsonMatch[0];
    const parsed = JSON.parse(jsonStr) as { topics: TopicSuggestion[] };

    if (!parsed.topics || !Array.isArray(parsed.topics) || parsed.topics.length < 3) return null;

    return parsed.topics.slice(0, 5).map((t) => ({
      title: t.title || '주제 없음',
      description: t.description || '',
      tags: Array.isArray(t.tags) ? t.tags.slice(0, 4) : [],
    }));
  } catch (error) {
    console.error('[suggest-topics] Gemini error:', error);
    return null;
  }
}

// ============================================================================
// Route Handler
// ============================================================================

export async function POST(): Promise<NextResponse> {
  try {
    const aiTopics = await generateTopicsWithGemini();

    if (!aiTopics) {
      return NextResponse.json(
        { error: 'AI 주제 추천에 실패했습니다. 다시 시도해주세요.' },
        { status: 503 },
      );
    }

    return NextResponse.json({ topics: aiTopics, generated_by: 'gemini' });
  } catch (error) {
    console.error('[API] suggest-topics error:', error);
    return NextResponse.json(
      { error: 'Failed to suggest topics.' },
      { status: 500 },
    );
  }
}
