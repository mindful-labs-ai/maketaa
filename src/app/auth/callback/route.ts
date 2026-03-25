import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');

  const cookieStore = await cookies();
  const supabase = createServerClient(
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
    }
  );

  // 2) 내부 코드 → 세션 교환
  if (code) {
    try {
      await supabase.auth.exchangeCodeForSession(code);
    } catch (e) {
      console.error('exchange failed:', e);
      // 실패 시 로그인 페이지로
      return NextResponse.redirect(new URL('/signin', url.origin));
    }
  }

  // 3) Check for pending report from landing page analysis
  //    Primary: query param (passed through OAuth redirectTo / emailRedirectTo)
  //    Fallback: cookie (set by LandingHero client-side)
  const reportFromParam = url.searchParams.get('report_id');
  const reportFromCookie = cookieStore.get('pending_report_id')?.value;
  const pendingReportId = reportFromParam || reportFromCookie;

  console.log('[auth/callback] Full URL:', url.toString());
  console.log('[auth/callback] report_id from query param:', reportFromParam || 'NONE');
  console.log('[auth/callback] report_id from cookie:', reportFromCookie || 'NONE');
  console.log('[auth/callback] Using pendingReportId:', pendingReportId || 'NONE');

  if (pendingReportId) {
    const { data: { user } } = await supabase.auth.getUser();
    console.log('[auth/callback] User:', user?.id || 'NO USER');

    if (user) {
      const { data: claimed, error: claimError } = await supabase
        .from('marketing_reports')
        .update({ user_id: user.id })
        .eq('id', pendingReportId)
        .is('user_id', null)
        .select('id');

      console.log('[auth/callback] Claim result:', JSON.stringify({ claimed, claimError }));
    }

    try { cookieStore.delete('pending_report_id'); } catch { /* noop */ }
    console.log('[auth/callback] Redirecting to /report/' + pendingReportId);
    return NextResponse.redirect(new URL(`/report/${pendingReportId}`, url.origin));
  }

  console.log('[auth/callback] No pending report, redirecting to /dashboard');
  return NextResponse.redirect(new URL('/dashboard', url.origin));
}
