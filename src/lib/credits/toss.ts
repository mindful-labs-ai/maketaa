'use client';

import { type PackageId } from './packages';

export async function requestCreditPayment(packageId: PackageId, userEmail: string) {
  // 1. Create order on server
  const res = await fetch('/api/credits/payments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ packageId }),
  });

  if (!res.ok) {
    throw new Error('주문 생성에 실패했습니다.');
  }

  const { orderId, amount, orderName } = await res.json();

  // 2. Load TossPayments SDK dynamically
  const { loadTossPayments } = await import('@tosspayments/tosspayments-sdk');
  const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;

  if (!clientKey) {
    throw new Error('결제 설정이 올바르지 않습니다.');
  }

  const toss = await loadTossPayments(clientKey);
  const payment = toss.payment({ customerKey: userEmail });

  await payment.requestPayment({
    method: 'CARD',
    amount: { currency: 'KRW', value: amount },
    orderId,
    orderName,
    successUrl: `${window.location.origin}/credits/success`,
    failUrl: `${window.location.origin}/credits/fail`,
  });
}
