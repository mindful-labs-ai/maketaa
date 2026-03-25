'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Coins, Check, Sparkles } from 'lucide-react';
import { CREDIT_PACKAGES, type PackageId } from '@/lib/credits/packages';
import { useAuthStore } from '@/lib/shared/useAuthStore';
import { requestCreditPayment } from '@/lib/credits/toss';

const PACKAGE_LIST = Object.values(CREDIT_PACKAGES);

export default function ChargePage() {
  const router = useRouter();
  const userEmail = useAuthStore((s) => s.userEmail);
  const [selected, setSelected] = useState<PackageId>('business');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePurchase = async () => {
    if (!userEmail) {
      setError('로그인이 필요합니다.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await requestCreditPayment(selected, userEmail);
    } catch (err) {
      setError(err instanceof Error ? err.message : '결제 처리 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  return (
    <div className='max-w-3xl mx-auto p-6 space-y-6'>
      {/* Header */}
      <div className='flex items-center gap-3'>
        <button
          type='button'
          onClick={() => router.push('/credits')}
          className='p-2 rounded-lg hover:bg-[--surface-2] transition-colors'
        >
          <ArrowLeft size={18} className='text-[--text-secondary]' />
        </button>
        <h1 className='text-xl font-bold text-[--text-primary]'>크레딧 충전</h1>
      </div>

      {/* Package Grid */}
      <div className='grid gap-4 sm:grid-cols-2'>
        {PACKAGE_LIST.map((pkg) => {
          const isSelected = selected === pkg.id;
          const isPopular = pkg.id === 'business';

          return (
            <button
              key={pkg.id}
              type='button'
              onClick={() => setSelected(pkg.id)}
              className='relative text-left rounded-2xl border-2 p-5 transition-all'
              style={{
                backgroundColor: 'var(--surface-1)',
                borderColor: isSelected ? 'var(--brand-primary)' : 'var(--border-subtle)',
              }}
            >
              {/* Popular badge */}
              {isPopular && (
                <span
                  className='absolute -top-3 left-4 text-[10px] font-bold px-2.5 py-0.5 rounded-full text-white flex items-center gap-1'
                  style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))' }}
                >
                  <Sparkles size={10} />
                  인기
                </span>
              )}

              {/* Selected check */}
              {isSelected && (
                <span
                  className='absolute top-4 right-4 w-5 h-5 rounded-full flex items-center justify-center text-white'
                  style={{ backgroundColor: 'var(--brand-primary)' }}
                >
                  <Check size={12} strokeWidth={3} />
                </span>
              )}

              <h3 className='text-base font-semibold text-[--text-primary] mb-1'>{pkg.name}</h3>

              <div className='flex items-baseline gap-1 mb-3'>
                <span className='text-2xl font-bold text-[--text-primary]'>
                  {pkg.credits.toLocaleString()}
                </span>
                <span className='text-sm text-[--text-secondary]'>크레딧</span>
                {pkg.bonus && (
                  <span
                    className='ml-2 text-xs font-semibold px-1.5 py-0.5 rounded'
                    style={{ color: 'var(--brand-primary)', backgroundColor: 'rgba(124, 92, 252, 0.1)' }}
                  >
                    {pkg.bonus}
                  </span>
                )}
              </div>

              <div className='flex items-baseline justify-between'>
                <span className='text-lg font-semibold text-[--text-primary]'>
                  ₩{pkg.price.toLocaleString()}
                </span>
                <span className='text-xs text-[--text-tertiary]'>
                  크레딧당 ₩{pkg.pricePerCredit}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <p className='text-sm text-[--error] text-center'>{error}</p>
      )}

      {/* Purchase Button */}
      <button
        type='button'
        onClick={handlePurchase}
        disabled={loading}
        className='w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-medium transition-opacity hover:opacity-90 disabled:opacity-50'
        style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))' }}
      >
        <Coins size={18} />
        {loading ? '처리 중...' : `₩${CREDIT_PACKAGES[selected].price.toLocaleString()} 결제하기`}
      </button>

      {/* Info */}
      <p className='text-xs text-[--text-tertiary] text-center'>
        결제는 토스페이먼츠를 통해 안전하게 처리됩니다.
      </p>
    </div>
  );
}
