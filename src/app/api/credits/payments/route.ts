import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { CREDIT_PACKAGES, type PackageId } from '@/lib/credits/packages';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { packageId } = (await req.json()) as { packageId: string };

    if (!packageId || !(packageId in CREDIT_PACKAGES)) {
      return NextResponse.json({ error: 'Invalid package' }, { status: 400 });
    }

    const pkg = CREDIT_PACKAGES[packageId as PackageId];
    const orderId = `MAKETAA-${user.id.slice(0, 8)}-${Date.now()}`;

    const { data: payment, error } = await supabase
      .from('credit_payments')
      .insert({
        user_id: user.id,
        order_id: orderId,
        package_id: packageId,
        amount: pkg.price,
        credits: pkg.credits,
        status: 'pending',
      })
      .select('id')
      .single();

    if (error) throw error;

    return NextResponse.json({
      orderId,
      paymentId: payment.id,
      amount: pkg.price,
      orderName: `Maketaa ${pkg.name} 패키지 (${pkg.credits.toLocaleString()} 크레딧)`,
    });
  } catch (err) {
    console.error('[POST /api/credits/payments]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
