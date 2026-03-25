import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('credit_balances')
      .select('balance, total_purchased, total_consumed')
      .eq('user_id', user.id)
      .single();

    if (error && error.code === 'PGRST116') {
      // No record found — new user without balance record yet
      return NextResponse.json({
        balance: 0,
        totalPurchased: 0,
        totalConsumed: 0,
      });
    }

    if (error) throw error;

    return NextResponse.json({
      balance: data.balance,
      totalPurchased: data.total_purchased,
      totalConsumed: data.total_consumed,
    });
  } catch (err) {
    console.error('[GET /api/credits]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
