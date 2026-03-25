import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') ?? '20')));
    const type = url.searchParams.get('type'); // 'charge' | 'consume' | null

    const offset = (page - 1) * limit;

    let query = supabase
      .from('credit_transactions')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (type && ['charge', 'consume', 'refund', 'admin_grant'].includes(type)) {
      query = query.eq('type', type);
    }

    const { data: transactions, count, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      transactions: transactions ?? [],
      total: count ?? 0,
      page,
      limit,
    });
  } catch (err) {
    console.error('[GET /api/credits/transactions]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
