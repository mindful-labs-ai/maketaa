import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// Direct Supabase client (no cookies needed — this is a public endpoint)
// Uses service role key to bypass RLS for insert, falls back to anon key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL이 필요합니다.' }, { status: 400 });
    }

    // Validate URL format and block SSRF
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: '올바른 URL 형식이 아닙니다.' }, { status: 400 });
    }

    // Only allow http/https protocols
    if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
      return NextResponse.json({ error: '올바른 URL 형식이 아닙니다.' }, { status: 400 });
    }

    // Block private/internal hostnames
    const hostname = parsedUrl.hostname.toLowerCase();
    const blockedPatterns = [
      /^localhost$/,
      /^127\./,
      /^10\./,
      /^172\.(1[6-9]|2\d|3[01])\./,
      /^192\.168\./,
      /^169\.254\./,
      /^0\./,
      /^\[::1\]$/,
      /^metadata\./,
    ];
    if (blockedPatterns.some((p) => p.test(hostname))) {
      return NextResponse.json({ error: '올바른 URL 형식이 아닙니다.' }, { status: 400 });
    }

    // Fetch the website and extract metadata
    let title = '';
    let description = '';
    let bodyText = '';

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(parsedUrl.toString(), {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Maketaa/1.0)',
          Accept: 'text/html',
        },
      });
      clearTimeout(timeout);

      const html = await res.text();

      // Extract meta tags with regex (no cheerio needed)
      const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      title = titleMatch?.[1]?.trim() || '';

      const descMatch =
        html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*?)["']/i) ??
        html.match(/<meta[^>]*content=["']([^"']*?)["'][^>]*name=["']description["']/i);
      description = descMatch?.[1]?.trim() || '';

      const ogTitleMatch =
        html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*?)["']/i) ??
        html.match(/<meta[^>]*content=["']([^"']*?)["'][^>]*property=["']og:title["']/i);
      if (!title && ogTitleMatch) title = ogTitleMatch[1].trim();

      const ogDescMatch =
        html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*?)["']/i) ??
        html.match(/<meta[^>]*content=["']([^"']*?)["'][^>]*property=["']og:description["']/i);
      if (!description && ogDescMatch) description = ogDescMatch[1].trim();

      // Extract visible text (strip tags, limit length)
      bodyText = html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 2000);
    } catch {
      // If fetch fails, proceed with just the URL — AI can still infer from domain
    }

    // Generate marketing strategy with Gemini
    const prompt = `당신은 디지털 마케팅 전략가입니다. 아래 웹사이트 정보를 분석하고 맞춤 마케팅 콘텐츠 전략을 JSON으로 작성하세요.

웹사이트 URL: ${parsedUrl.toString()}
페이지 제목: ${title || '(추출 불가)'}
페이지 설명: ${description || '(추출 불가)'}
페이지 내용 요약: ${bodyText.slice(0, 1000) || '(추출 불가)'}

다음 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{
  "businessName": "비즈니스/브랜드 이름",
  "businessType": "비즈니스 유형 (예: 온라인 쇼핑몰, SaaS, 로컬 매장, 교육, 미디어 등)",
  "summary": "비즈니스에 대한 1-2문장 요약",
  "contentStrategy": [
    "추천 콘텐츠 전략 1",
    "추천 콘텐츠 전략 2",
    "추천 콘텐츠 전략 3"
  ],
  "recommendedActions": [
    { "tool": "숏폼 메이커", "action": "이 비즈니스에 맞는 구체적인 숏폼 영상 제안" },
    { "tool": "카드뉴스 메이커", "action": "이 비즈니스에 맞는 구체적인 카드뉴스 제안" }
  ]
}`;

    const result = await genai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: prompt,
    });

    const text = result.text ?? '';

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: '분석 결과를 생성하지 못했습니다.' },
        { status: 500 },
      );
    }

    let report;
    try {
      report = JSON.parse(jsonMatch[0]);
    } catch {
      console.error('[/api/analyze] Failed to parse Gemini JSON:', jsonMatch[0].slice(0, 200));
      return NextResponse.json(
        { error: '분석 결과를 파싱하지 못했습니다.' },
        { status: 500 },
      );
    }

    // Save report to Supabase

    const { data: saved, error: dbError } = await supabaseAdmin
      .from('marketing_reports')
      .insert({ url: parsedUrl.toString(), report })
      .select('id')
      .single();

    if (dbError) {
      console.error('[/api/analyze] DB save FAILED:', JSON.stringify(dbError));
      // Still return report even if DB save fails
      return NextResponse.json({ ...report, reportId: null });
    }

    // Report saved: saved.id
    return NextResponse.json({ ...report, reportId: saved.id });
  } catch (err) {
    console.error('[/api/analyze]', err);
    return NextResponse.json(
      { error: '분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },
      { status: 500 },
    );
  }
}
