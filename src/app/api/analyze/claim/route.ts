import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const { reportId } = await req.json();

    if (!reportId || typeof reportId !== 'string') {
      return NextResponse.json({ error: 'reportId가 필요합니다.' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      },
    );

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    // Claim the report (RLS policy ensures only unclaimed reports can be updated)
    const { data: claimed, error: updateError } = await supabase
      .from('marketing_reports')
      .update({ user_id: user.id })
      .eq('id', reportId)
      .is('user_id', null)
      .select('id');

    if (updateError) {
      console.error('[/api/analyze/claim]', updateError);
      return NextResponse.json({ error: '리포트 연결에 실패했습니다.' }, { status: 500 });
    }

    if (!claimed || claimed.length === 0) {
      return NextResponse.json({ error: '리포트를 찾을 수 없거나 이미 연결되었습니다.' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[/api/analyze/claim]', err);
    return NextResponse.json({ error: '오류가 발생했습니다.' }, { status: 500 });
  }
}
