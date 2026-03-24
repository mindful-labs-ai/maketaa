/**
 * POST /api/card-news/generate
 * Generates a CardSpec using Gemini AI, saves to Supabase
 * Ported from canvas_editor - removed mental-health hardcoding
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type {
  CardSpec,
  Card,
  CardRole,
  CardBackground,
  CardStyle,
  TopicSelection,
  PurposeConfig,
  SnsConfig,
} from '@/lib/card-news/types';

// ============================================================================
// Supabase Server Client
// ============================================================================

async function getSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    },
  );
}

// ============================================================================
// Unsplash Image Search
// ============================================================================

async function fetchUnsplashImage(query: string): Promise<string | null> {
  const accessKey = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;
  if (!accessKey) return null;

  try {
    const url = new URL('https://api.unsplash.com/search/photos');
    url.searchParams.set('query', query);
    url.searchParams.set('per_page', '1');
    url.searchParams.set('orientation', 'squarish');

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Client-ID ${accessKey}`,
        'Accept-Version': 'v1',
      },
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.results?.[0]?.urls?.regular || null;
  } catch {
    return null;
  }
}

// ============================================================================
// Style Constants
// ============================================================================

const PALETTES: Record<string, { primary: string; text: string; background: string; secondary: string }> = {
  'longblack-editorial': { primary: '#4A7AFF', text: '#FFFFFF', background: '#2A2A2E', secondary: '#A0A4B8' },
  'warm-modern': { primary: '#E8A87C', text: '#FFFFFF', background: '#2A2A2E', secondary: '#A0A4B8' },
};

const EDITORIAL_FONT = {
  headline_family: 'Pretendard',
  headline_size: 48,
  body_family: 'Pretendard',
  body_size: 36,
};

const EDITORIAL_BACKGROUND: CardBackground = {
  type: 'solid',
  overlay_opacity: 0,
};

let activePalette = PALETTES['longblack-editorial'];

function makeStyle(layout: CardStyle['layout'] = 'top-left'): CardStyle {
  return {
    layout,
    color_palette: { ...activePalette },
    font: { ...EDITORIAL_FONT },
  };
}

// ============================================================================
// Gemini Prompt (generalized - no mental-health specific content)
// ============================================================================

function buildGeminiPrompt(topic: TopicSelection, purpose: PurposeConfig): string {
  const purposeDesc =
    purpose.type === 'informational'
      ? '정보 전달 중심 — 지식과 팁을 공유하는 교육적 콘텐츠'
      : purpose.type === 'action-driven'
        ? `행동 유도 중심 — CTA: ${purpose.cta?.text || '팔로우/댓글 유도'}${purpose.cta?.url ? `, URL: ${purpose.cta.url}` : ''}`
        : 'AI 자율 판단 — 주제에 가장 적합한 구성';

  return `당신은 카드뉴스 전문 카피라이터입니다.
아래 주제와 목적에 맞는 카드뉴스 텍스트를 생성해주세요.

## 주제
- 제목: ${topic.title}
- 설명: ${topic.description || '없음'}
- 태그: ${topic.tags?.join(', ') || '없음'}

## 목적
${purposeDesc}

## 카드 구조
카드는 3가지 역할로만 구분됩니다:

### 1. cover (표지) — 1장 고정
임팩트 있는 짧은 헤드라인 (15자 이내). sub_text에 해시태그 3개.

### 2. content (본문) — 최소 4장, 최대 8장
각 카드는 하나의 완결된 메시지를 담아야 합니다.
두 가지 레이아웃 중 하나를 선택:
- **basic** (기본): headline + body(2-3문장) + sub_text
- **memo** (메모): headline + bullet_points(3-5개, 각 20자 이내). 최대 1장만.

### 3. end (마무리) — 1장 고정
${purpose.type === 'action-driven' ? `CTA 텍스트를 헤드라인으로: "${purpose.cta?.text || '더 알아보기'}"` : '감성적 마무리 헤드라인'} + 안내 본문 + sub_text.

## 문체 가이드
- 따뜻하고 친근한 톤
- 짧은 문장, 가독성 확보
- 전문 용어는 쉽게 풀어서

## 응답 형식
JSON만 출력:
\`\`\`json
{
  "cards": [
    {"role": "cover", "headline": "...", "body": null, "sub_text": "#태그1 #태그2 #태그3", "bullet_points": null},
    {"role": "content", "content_layout": "basic", "headline": "...", "body": "...", "sub_text": "...", "bullet_points": null},
    {"role": "end", "headline": "...", "body": "...", "sub_text": "...", "bullet_points": null}
  ],
  "sns": {
    "instagram_caption": "...",
    "hashtags": ["태그1", "태그2"],
    "threads_text": "..."
  }
}
\`\`\``;
}

interface GeminiCardData {
  role: 'cover' | 'content' | 'end';
  content_layout?: 'basic' | 'memo';
  headline: string;
  body: string | null;
  sub_text: string | null;
  bullet_points: string[] | null;
}

interface GeminiResponse {
  cards: GeminiCardData[];
  sns: {
    instagram_caption: string;
    hashtags: string[];
    threads_text: string;
  };
}

async function generateWithGemini(
  topic: TopicSelection,
  purpose: PurposeConfig,
): Promise<GeminiResponse | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = buildGeminiPrompt(topic, purpose);
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    const text = response.text ?? '';

    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) || text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const jsonStr = jsonMatch[1] || jsonMatch[0];
    const parsed = JSON.parse(jsonStr) as GeminiResponse;

    if (!parsed.cards || !Array.isArray(parsed.cards) || parsed.cards.length < 3) return null;
    return parsed;
  } catch (error) {
    console.error('[generate-card-news] Gemini error:', error);
    return null;
  }
}

async function generateImageKeywords(koreanText: string, mood: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return 'abstract minimal background';

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `주어진 한국어 텍스트에서 Unsplash 이미지 검색에 적합한 영어 키워드 3-4개를 생성하세요.
분위기: ${mood}
텍스트: "${koreanText}"
규칙: 영어 단어만 3-4개, 공백으로 구분. 다른 텍스트 없이 키워드만 출력.`,
    });
    const text = response.text?.trim() || '';
    const words = text.split(/\s+/).filter((w) => /^[a-zA-Z]+$/.test(w));
    if (words.length >= 2 && words.length <= 6) return words.join(' ');
    return 'abstract minimal background';
  } catch {
    return 'abstract minimal background';
  }
}

function geminiToCards(
  geminiData: GeminiResponse,
  coverImage: string | null,
  endImage: string | null,
): { cards: Card[]; sns: SnsConfig } {
  const cards: Card[] = geminiData.cards.map((gc, i) => {
    const role = gc.role as CardRole;
    const text: Card['text'] = { headline: gc.headline };
    if (gc.body) text.body = gc.body;
    if (gc.sub_text) text.sub_text = gc.sub_text;
    if (gc.bullet_points?.length) text.bullet_points = gc.bullet_points;

    const layout: CardStyle['layout'] = role === 'cover' || role === 'end' ? 'center' : 'top-left';

    let background: CardBackground = { ...EDITORIAL_BACKGROUND };
    if (role === 'cover' && coverImage) {
      background = { type: 'image', src: coverImage, overlay_opacity: 0.55 };
    } else if (role === 'end' && endImage) {
      background = { type: 'image', src: endImage, overlay_opacity: 0.55 };
    }

    const card: Card = {
      index: i + 1,
      role,
      text: text as Card['text'],
      style: makeStyle(layout),
      background,
    };

    if (role === 'content' && gc.content_layout) {
      card.content_layout = gc.content_layout;
    }

    return card;
  });

  const sns: SnsConfig = {
    instagram: {
      caption: geminiData.sns?.instagram_caption || '',
      hashtags: geminiData.sns?.hashtags || [],
    },
    threads: {
      text: geminiData.sns?.threads_text || '',
    },
  };

  return { cards, sns };
}

// ============================================================================
// Route Handler
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const {
      topic,
      purpose,
      template_id: templateId = 'longblack-editorial',
      canvas_ratio: canvasRatio = '1:1',
    } = body as {
      topic: TopicSelection;
      purpose: PurposeConfig;
      template_id?: string;
      canvas_ratio?: '1:1' | '4:5' | '9:16';
    };

    if (!topic?.title) {
      return NextResponse.json({ error: 'topic.title is required' }, { status: 400 });
    }
    if (!purpose?.type) {
      return NextResponse.json({ error: 'purpose.type is required' }, { status: 400 });
    }

    // Auth check
    const supabase = await getSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    activePalette = PALETTES[templateId] || PALETTES['longblack-editorial'];

    const geminiResult = await generateWithGemini(topic, purpose);
    if (!geminiResult) {
      return NextResponse.json(
        { error: 'AI 생성에 실패했습니다. 다시 시도해주세요.' },
        { status: 503 },
      );
    }

    // Fetch images in parallel
    const endCard = geminiResult.cards.find((c) => c.role === 'end');
    const [coverQuery, endQuery] = await Promise.all([
      generateImageKeywords(`${topic.title} ${topic.tags?.join(' ') || ''}`, 'dark moody editorial'),
      generateImageKeywords(endCard?.headline || topic.title, 'hopeful warm'),
    ]);

    const [coverImage, endImage] = await Promise.all([
      fetchUnsplashImage(coverQuery),
      fetchUnsplashImage(endQuery),
    ]);

    const { cards, sns } = geminiToCards(geminiResult, coverImage, endImage);

    const spec: CardSpec = {
      meta: {
        id,
        topic: topic.title,
        angle: topic.description,
        created_at: now,
        status: 'draft',
      },
      cards,
      sns,
      canvas_ratio: canvasRatio,
    };

    // Save to Supabase
    const { error: dbError } = await supabase.from('card_specs').insert([{
      id,
      owner_id: user.id,
      topic: topic.title,
      status: 'draft',
      spec,
      canvas_ratio: canvasRatio,
    }]);

    if (dbError) {
      console.error('[generate-card-news] DB save error:', dbError);
    }

    return NextResponse.json({ spec, id, generated_by: 'gemini' });
  } catch (error) {
    console.error('[API] generate-card-news error:', error);
    return NextResponse.json(
      { error: 'Failed to generate card news.' },
      { status: 500 },
    );
  }
}
