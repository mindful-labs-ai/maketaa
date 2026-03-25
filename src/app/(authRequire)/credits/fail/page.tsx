'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { XCircle } from 'lucide-react';

export default function PaymentFailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = searchParams.get('code');
  const message = searchParams.get('message');

  return (
    <div className='flex items-center justify-center min-h-[60vh] p-6'>
      <div
        className='w-full max-w-sm rounded-2xl border p-8 text-center'
        style={{ backgroundColor: 'var(--surface-1)', borderColor: 'var(--border-subtle)' }}
      >
        <XCircle size={48} className='mx-auto mb-4 text-[--error]' />
        <h2 className='text-lg font-semibold text-[--text-primary] mb-2'>결제 실패</h2>
        <p className='text-sm text-[--text-secondary] mb-1'>
          {message || '결제 처리 중 문제가 발생했습니다.'}
        </p>
        {code && (
          <p className='text-xs text-[--text-tertiary] mb-5'>에러 코드: {code}</p>
        )}

        <div className='flex gap-3'>
          <button
            type='button'
            onClick={() => router.push('/credits')}
            className='flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors hover:bg-[--surface-2]'
            style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}
          >
            돌아가기
          </button>
          <button
            type='button'
            onClick={() => router.push('/credits/charge')}
            className='flex-1 py-2.5 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90'
            style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))' }}
          >
            다시 시도
          </button>
        </div>
      </div>
    </div>
  );
}
