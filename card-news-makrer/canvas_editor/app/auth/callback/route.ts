/**
 * Auth Callback Route
 *
 * Supabase Magic Link 인증 후 리다이렉트를 처리합니다.
 * @supabase/ssr을 사용하여 세션 쿠키를 HTTP 응답에 올바르게 설정합니다.
 */

import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;

  if (code) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    // 리다이렉트 응답을 먼저 생성
    const response = NextResponse.redirect(`${origin}/`);

    // 쿠키를 응답에 설정하는 Supabase 클라이언트 생성
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    // code를 세션으로 교환 — 쿠키가 response에 자동 설정됨
    await supabase.auth.exchangeCodeForSession(code);

    return response;
  }

  // code가 없으면 로그인 페이지로
  return NextResponse.redirect(`${origin}/login`);
}
