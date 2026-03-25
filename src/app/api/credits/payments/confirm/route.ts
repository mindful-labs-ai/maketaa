import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { CREDIT_PACKAGES, type PackageId } from '@/lib/credits/packages';

const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY ?? '';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { paymentKey, orderId, amount } = (await req.json()) as {
      paymentKey: string;
      orderId: string;
      amount: number;
    };

    if (!paymentKey || !orderId || !amount) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // 1. Verify order exists and matches
    const { data: payment, error: fetchErr } = await supabase
      .from('credit_payments')
      .select('*')
      .eq('order_id', orderId)
      .eq('user_id', user.id)
      .single();

    if (fetchErr || !payment) {
      return NextResponse.json({ error: 'INVALID_ORDER' }, { status: 400 });
    }

    if (payment.amount !== amount) {
      return NextResponse.json({ error: 'AMOUNT_MISMATCH' }, { status: 400 });
    }

    if (payment.status === 'confirmed') {
      // Idempotent: return current balance instead of error (handles React StrictMode double-call)
      const { data: bal } = await supabase
        .from('credit_balances')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      return NextResponse.json({
        success: true,
        balance: bal?.balance ?? 0,
        credits: payment.credits,
      });
    }

    // 2. Confirm with TossPayments API
    const confirmRes = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(TOSS_SECRET_KEY + ':').toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    });

    if (!confirmRes.ok) {
      const errBody = await confirmRes.text();
      console.error('[confirm] Toss confirm failed:', errBody);

      try {
        await supabase.rpc('update_payment_failed', {
          p_payment_id: payment.id,
          p_reason: '토스페이먼츠 승인 실패',
        });
      } catch {
        // Non-critical: best-effort status update
      }

      return NextResponse.json({ error: 'PAYMENT_FAILED' }, { status: 400 });
    }

    // 3. Charge credits via RPC (atomic: checks status, sets confirmed, adds credits)
    // The charge_credits RPC uses FOR UPDATE lock and checks status !== 'confirmed'
    // to prevent double-charge even under concurrent requests
    const pkg = CREDIT_PACKAGES[payment.package_id as PackageId];
    const { data: result, error: rpcErr } = await supabase.rpc('charge_credits', {
      p_user_id: user.id,
      p_payment_id: payment.id,
      p_credits: payment.credits,
      p_description: `${pkg?.name ?? payment.package_id} 패키지 충전`,
    });

    if (rpcErr) throw rpcErr;

    const rpcResult = result as { success: boolean; balance?: number; error?: string };
    if (!rpcResult.success) {
      return NextResponse.json({ error: rpcResult.error ?? 'CHARGE_FAILED' }, { status: 400 });
    }

    // 4. Save paymentKey (best-effort, non-critical)
    try {
      await supabase.rpc('update_payment_key', {
        p_payment_id: payment.id,
        p_payment_key: paymentKey,
      });
    } catch {
      // Non-critical: payment_key is for reference only
      console.warn('[confirm] Failed to save payment_key');
    }

    return NextResponse.json({
      success: true,
      balance: rpcResult.balance,
      credits: payment.credits,
    });
  } catch (err) {
    console.error('[POST /api/credits/payments/confirm]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
