'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, Loader2, Coins } from 'lucide-react';
import { useCreditStore } from '@/lib/credits/useCreditStore';

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const setBalance = useCreditStore((s) => s.setBalance);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [credits, setCredits] = useState(0);
  const [balance, setLocalBalance] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  const confirmedRef = useRef(false);

  useEffect(() => {
    if (confirmedRef.current) return;
    confirmedRef.current = true;

    const paymentKey = searchParams.get('paymentKey');
    const orderId = searchParams.get('orderId');
    const amount = searchParams.get('amount');

    if (!paymentKey || !orderId || !amount) {
      setStatus('error');
      setErrorMsg('결제 정보가 올바르지 않습니다.');
      return;
    }

    fetch('/api/credits/payments/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentKey,
        orderId,
        amount: parseInt(amount),
      }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok && data.success) {
          setStatus('success');
          setCredits(data.credits);
          setLocalBalance(data.balance);
          setBalance(data.balance);
        } else {
          setStatus('error');
          setErrorMsg(data.error || '결제 확인에 실패했습니다.');
        }
      })
      .catch(() => {
        setStatus('error');
        setErrorMsg('서버 연결에 실패했습니다.');
      });
  }, [searchParams, setBalance]);

  return (
    <div className='flex items-center justify-center min-h-[60vh] p-6'>
      <div
        className='w-full max-w-sm rounded-2xl border p-8 text-center'
        style={{ backgroundColor: 'var(--surface-1)', borderColor: 'var(--border-subtle)' }}
      >
        {status === 'loading' && (
          <>
            <Loader2 size={48} className='mx-auto mb-4 animate-spin text-[--brand-primary]' />
            <h2 className='text-lg font-semibold text-[--text-primary] mb-2'>결제 확인 중...</h2>
            <p className='text-sm text-[--text-secondary]'>잠시만 기다려주세요.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle size={48} className='mx-auto mb-4' style={{ color: 'var(--success, #22c55e)' }} />
            <h2 className='text-lg font-semibold text-[--text-primary] mb-2'>충전 완료!</h2>
            <div
              className='rounded-xl p-4 mb-5 space-y-2'
              style={{ backgroundColor: 'var(--surface-2)' }}
            >
              <div className='flex justify-between text-sm'>
                <span className='text-[--text-secondary]'>충전 크레딧</span>
                <span className='font-semibold' style={{ color: 'var(--success, #22c55e)' }}>
                  +{credits.toLocaleString()}
                </span>
              </div>
              <div className='flex justify-between text-sm'>
                <span className='text-[--text-secondary]'>현재 잔액</span>
                <span className='font-semibold text-[--text-primary]'>
                  {balance.toLocaleString()} 크레딧
                </span>
              </div>
            </div>
            <button
              type='button'
              onClick={() => router.push('/credits')}
              className='w-full py-2.5 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90'
              style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))' }}
            >
              크레딧 대시보드로
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <Coins size={48} className='mx-auto mb-4 text-[--error]' />
            <h2 className='text-lg font-semibold text-[--text-primary] mb-2'>결제 확인 실패</h2>
            <p className='text-sm text-[--text-secondary] mb-5'>{errorMsg}</p>
            <button
              type='button'
              onClick={() => router.push('/credits/charge')}
              className='w-full py-2.5 rounded-xl text-sm font-medium border transition-colors hover:bg-[--surface-2]'
              style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
            >
              다시 시도하기
            </button>
          </>
        )}
      </div>
    </div>
  );
}
