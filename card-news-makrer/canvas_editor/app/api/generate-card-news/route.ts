/**
 * POST /api/generate-card-news
 * Generates a complete CardSpec using Google Gemini AI.
 *
 * Flow: topic + purpose + template → Gemini prompt → JSON CardSpec → return
 * Fallback: if Gemini fails or key missing, uses static builder.
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import type {
  CardSpec,
  Card,
  CardRole,
  CardBackground,
  CardStyle,
  TopicSelection,
  PurposeConfig,
  SnsConfig,
} from '@/types';

// ============================================================================
// Unsplash Image Search (server-side)
// ============================================================================

async function fetchUnsplashImage(query: string): Promise<string | null> {
  const accessKey = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;
  console.log('[unsplash] key present:', !!accessKey, 'query:', query);
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

    console.log('[unsplash] response status:', response.status);
    if (!response.ok) return null;

    const data = await response.json();
    const photo = data.results?.[0];
    const imageUrl = photo?.urls?.regular || null;
    console.log('[unsplash] result:', imageUrl ? imageUrl.slice(0, 60) + '...' : 'no results');
    return imageUrl;
  } catch (err) {
    console.error('[unsplash] error:', err);
    return null;
  }
}

// ============================================================================
// Gemini Image Generation (fallback when Unsplash has no results)
// ============================================================================

async function generateImageWithGemini(prompt: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    console.log('[gemini-image] Generating image for:', prompt);
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts) return null;

    for (const part of parts) {
      if ((part as any).inlineData) {
        const inlineData = (part as any).inlineData;
        const dataUrl = `data:${inlineData.mimeType || 'image/png'};base64,${inlineData.data}`;
        console.log('[gemini-image] Generated image, size:', inlineData.data.length, 'chars');
        return dataUrl;
      }
    }
    return null;
  } catch (err) {
    console.error('[gemini-image] error:', err instanceof Error ? err.message : err);
    return null;
  }
}

// ============================================================================
// LongBlack Editorial template style constants
// ============================================================================

const PALETTES: Record<string, { primary: string; text: string; background: string; secondary: string }> = {
  'longblack-editorial': { primary: '#4A7AFF', text: '#FFFFFF', background: '#2A2A2E', secondary: '#A0A4B8' },
  'mindthos-green': { primary: '#44CE4B', text: '#FFFFFF', background: '#2A2A2E', secondary: '#A0A4B8' },
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
// Gemini AI Generation
// ============================================================================

function buildGeminiPrompt(
  topic: TopicSelection,
  purpose: PurposeConfig,
): string {
  const purposeDesc =
    purpose.type === 'informational'
      ? '정보 전달 중심 — 지식과 팁을 공유하는 교육적 콘텐츠'
      : purpose.type === 'action-driven'
        ? `행동 유도 중심 — CTA: ${purpose.cta?.text || '팔로우/댓글 유도'}${purpose.cta?.url ? `, URL: ${purpose.cta.url}` : ''}`
        : 'AI 자율 판단 — 주제에 가장 적합한 구성';

  return `당신은 정신건강 카드뉴스 전문 카피라이터입니다.
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
⚠️ 매우 중요: 본문 카드의 수는 주제에 따라 반드시 달라져야 합니다.
- 단순 팁/리스트 주제: 4장
- 일반적인 주제: 5-6장
- 심층 분석이 필요한 주제: 7-8장
예시 JSON의 카드 수를 그대로 따르지 마세요. 주제의 내용에 맞는 적절한 수를 스스로 판단하세요.

각 카드는 하나의 완결된 메시지를 담아야 합니다. 독자가 한 카드만 봐도 핵심을 이해할 수 있어야 합니다.

각 content 카드는 두 가지 레이아웃 중 하나를 선택합니다:

- **basic** (기본 카드): headline + body(2-3문장) + sub_text 구성.
  공감, 원인 분석, 해결법, 인사이트 등 서술형 콘텐츠에 적합.
  body는 반드시 완결된 문장으로 끝나야 합니다.

- **memo** (메모 카드): headline + bullet_points(3-5개, 각 20자 이내) 구성.
  실천 팁, 체크리스트, 요약 정리 등 목록형 콘텐츠에 적합.
  ⚠️ 메모 카드는 한 세트에 최대 1장만 사용하세요. 메모 카드 없이 basic만으로 구성해도 됩니다.

### 3. end (마무리) — 1장 고정
${purpose.type === 'action-driven' ? `CTA 텍스트를 헤드라인으로 사용: "${purpose.cta?.text || '더 알아보기'}"` : '관심 유도형 또는 감성적 마무리 헤드라인'} + 안내 본문 + sub_text에 감성 메시지.

## 문체 가이드
- 따뜻하고 친근한 톤 (반말/존댓말 혼용 OK)
- 짧은 문장, 줄바꿈으로 가독성 확보
- 전문 용어는 쉽게 풀어서
- 감성적이되 과장하지 않기

## 응답 형식
반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트 없이 JSON만 출력:

\`\`\`json
{
  "cards": [
    {
      "role": "cover",
      "headline": "...",
      "body": null,
      "sub_text": "#태그1 #태그2 #태그3",
      "bullet_points": null
    },
    {"role": "content", "content_layout": "basic", "headline": "...", "body": "...", "sub_text": "...", "bullet_points": null},
    "... 주제에 따라 content 카드를 4~8장 자유롭게 추가 (basic 또는 memo) ...",
    {
      "role": "end",
      "headline": "...",
      "body": "...",
      "sub_text": "...",
      "bullet_points": null
    }
  ],
  "sns": {
    "instagram_caption": "...",
    "hashtags": ["태그1", "태그2", "..."],
    "threads_text": "..."
  }
}
\`\`\``;
}

interface GeminiCardData {
  role: 'cover' | 'content' | 'end';
  content_layout?: 'basic' | 'memo'; // only for content role
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
  if (!apiKey) {
    console.warn('[generate-card-news] GEMINI_API_KEY not set, using fallback');
    return null;
  }

  try {
    console.log('[generate-card-news] Calling Gemini API...', { topic: topic.title, key: apiKey?.slice(0, 12) });
    const t0 = Date.now();
    const ai = new GoogleGenAI({ apiKey });

    const prompt = buildGeminiPrompt(topic, purpose);
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    const text = response.text ?? '';
    console.log(`[generate-card-news] Gemini responded in ${((Date.now() - t0) / 1000).toFixed(1)}s, length: ${text.length}`);

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) || text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[generate-card-news] Failed to parse Gemini response:', text.slice(0, 200));
      return null;
    }

    const jsonStr = jsonMatch[1] || jsonMatch[0];
    const parsed = JSON.parse(jsonStr) as GeminiResponse;

    // Validate structure: minimum 5 cards (cover + 3 content + end), maximum 10
    if (!parsed.cards || !Array.isArray(parsed.cards) || parsed.cards.length < 5) {
      console.error('[generate-card-news] Invalid card count from Gemini:', parsed.cards?.length);
      return null;
    }

    return parsed;
  } catch (error) {
    console.error('[generate-card-news] Gemini API error:', error);
    return null;
  }
}

/**
 * Generate English Unsplash search keywords from Korean text using Gemini.
 * Returns 3-4 English words suitable for Unsplash photo search.
 */
async function generateImageKeywords(koreanText: string, mood: 'dark moody' | 'hopeful warm'): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return 'mental health peaceful nature';

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `주어진 한국어 텍스트에서 Unsplash 이미지 검색에 적합한 영어 키워드 3-4개를 생성하세요.
분위기: ${mood}
텍스트: "${koreanText}"

규칙:
- 영어 단어만 3-4개, 공백으로 구분
- 텍스트에 언급된 핵심 사물이나 상황을 반드시 포함하세요 (예: 지갑→wallet, 수면→sleep, 봄→spring)
- 나머지 1-2단어는 분위기를 보완하는 키워드
- "mental health" 같은 추상적 표현 대신 사진으로 찍을 수 있는 구체적 대상을 우선하세요
- 다른 텍스트 없이 키워드만 출력

예시: "봄철 우울감" → "spring rain window lonely"
예시: "금전 스트레스로 지친 지갑" → "wallet empty stress dark"
예시: "수면의 질을 높이는 방법" → "sleep bed night calm"`,
    });
    const text = response.text?.trim() || '';
    // Validate: should be 2-6 English words
    const words = text.split(/\s+/).filter(w => /^[a-zA-Z]+$/.test(w));
    if (words.length >= 2 && words.length <= 6) {
      console.log(`[image-keywords] "${koreanText}" → "${words.join(' ')}"`);
      return words.join(' ');
    }
    console.warn('[image-keywords] Invalid response:', text);
    return 'mental health peaceful nature';
  } catch (err) {
    console.error('[image-keywords] error:', err instanceof Error ? err.message : err);
    return 'mental health peaceful nature';
  }
}

async function geminiToCards(
  geminiData: GeminiResponse,
  topic: TopicSelection,
): Promise<{ cards: Card[]; sns: SnsConfig }> {
  // Generate English image keywords via Gemini (parallel for cover + end)
  const endCard = geminiData.cards.find(c => c.role === 'end');
  const endText = `${endCard?.headline || ''} ${endCard?.body || ''}`;

  const [coverQuery, endQuery] = await Promise.all([
    generateImageKeywords(`${topic.title} ${topic.tags?.join(' ') || ''}`, 'dark moody'),
    generateImageKeywords(endText || topic.title, 'hopeful warm'),
  ]);

  // Fetch with fallback: Unsplash → Unsplash generic → Gemini image generation
  async function fetchWithFallback(query: string, fallback: string, geminiPrompt: string): Promise<string | null> {
    const result = await fetchUnsplashImage(query);
    if (result) return result;
    const fallbackResult = await fetchUnsplashImage(fallback);
    if (fallbackResult) return fallbackResult;
    console.log('[image] Unsplash failed for both queries, trying Gemini image generation...');
    return generateImageWithGemini(geminiPrompt);
  }

  const [coverImage, endImage] = await Promise.all([
    fetchWithFallback(
      coverQuery,
      'peaceful nature abstract',
      `Create a beautiful, moody background image for a mental health card news cover about "${topic.title}". Style: dark, minimal, editorial. No text in the image. Square format.`
    ),
    fetchWithFallback(
      endQuery,
      'sunrise warm peaceful',
      `Create a hopeful, uplifting background image for: "${endCard?.headline || topic.title}". Style: warm light, sunrise, peaceful nature. No text in the image. Square format.`
    ),
  ]);

  const cards: Card[] = geminiData.cards.map((gc, i) => {
    const role = gc.role as CardRole;
    const text: any = { headline: gc.headline };
    if (gc.body) text.body = gc.body;
    if (gc.sub_text) text.sub_text = gc.sub_text;
    if (gc.bullet_points && gc.bullet_points.length > 0) text.bullet_points = gc.bullet_points;

    // Determine layout for styling
    const layout: CardStyle['layout'] = role === 'cover' || role === 'end' ? 'center' : 'top-left';

    let background: CardBackground = { ...EDITORIAL_BACKGROUND };
    if (role === 'cover') {
      background = {
        type: 'image',
        src: coverImage,
        overlay_opacity: 0.55,
      };
    } else if (role === 'end') {
      background = {
        type: 'image',
        src: endImage,
        overlay_opacity: 0.55,
      };
    }

    const card: Card = {
      index: i + 1,
      role,
      text,
      style: makeStyle(layout),
      background,
    };

    // Add content_layout for content cards
    if (role === 'content' && gc.content_layout) {
      card.content_layout = gc.content_layout as 'basic' | 'memo';
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

    const VALID_RATIOS = ['1:1', '4:5', '9:16'];
    if (!VALID_RATIOS.includes(canvasRatio)) {
      return NextResponse.json({ error: 'canvas_ratio must be one of: 1:1, 4:5, 9:16' }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    // Set active palette based on selected template
    activePalette = PALETTES[templateId] || PALETTES['longblack-editorial'];

    // Generate with Gemini AI (no fallback — fail if unavailable)
    const geminiResult = await generateWithGemini(topic, purpose);

    if (!geminiResult) {
      return NextResponse.json(
        { error: 'AI 생성에 실패했습니다. GEMINI_API_KEY를 확인하고 다시 시도해주세요.' },
        { status: 503 }
      );
    }

    const { cards, sns } = await geminiToCards(geminiResult, topic);

    const spec: CardSpec = {
      meta: {
        id,
        topic: topic.title,
        angle: topic.description,
        target_persona: '정신 건강에 관심 있는 성인',
        created_at: now,
        status: 'draft',
      },
      cards,
      sns,
      canvas_ratio: canvasRatio,
    };

    return NextResponse.json({ spec, id, generated_by: 'gemini' });
  } catch (error) {
    console.error('[API] generate-card-news error:', error);
    return NextResponse.json(
      { error: 'Failed to generate card news. Please try again.' },
      { status: 500 }
    );
  }
}
