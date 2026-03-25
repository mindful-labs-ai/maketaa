'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Coins, TrendingUp, TrendingDown, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCreditStore } from '@/lib/credits/useCreditStore';

interface Transaction {
  id: string;
  type: 'charge' | 'consume' | 'refund' | 'admin_grant';
  amount: number;
  balance_after: number;
  description: string | null;
  created_at: string;
}

const TYPE_LABELS: Record<string, string> = {
  charge: '충전',
  consume: '소모',
  refund: '환불',
  admin_grant: '지급',
};

const TYPE_COLORS: Record<string, string> = {
  charge: 'var(--success, #22c55e)',
  consume: 'var(--error)',
  refund: 'var(--brand-primary)',
  admin_grant: 'var(--brand-primary)',
};

export default function CreditsPage() {
  const router = useRouter();
  const balance = useCreditStore((s) => s.balance);
  const [stats, setStats] = useState({ totalPurchased: 0, totalConsumed: 0 });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const limit = 10;

  useEffect(() => {
    fetch('/api/credits')
      .then((r) => r.json())
      .then((d) => setStats({ totalPurchased: d.totalPurchased, totalConsumed: d.totalConsumed }))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/credits/transactions?page=${page}&limit=${limit}`)
      .then((r) => r.json())
      .then((d) => {
        setTransactions(d.transactions);
        setTotal(d.total);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className='max-w-3xl mx-auto p-6 space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <h1 className='text-xl font-bold text-[--text-primary]'>크레딧</h1>
        <button
          type='button'
          onClick={() => router.push('/credits/charge')}
          className='flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90'
          style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))' }}
        >
          <Coins size={16} />
          충전하기
          <ArrowRight size={14} />
        </button>
      </div>

      {/* Balance Card */}
      <div
        className='rounded-2xl p-6 border'
        style={{ backgroundColor: 'var(--surface-1)', borderColor: 'var(--border-subtle)' }}
      >
        <p className='text-sm text-[--text-secondary] mb-1'>현재 잔액</p>
        <p className='text-3xl font-bold text-[--text-primary]'>
          {balance !== null ? balance.toLocaleString() : '—'}{' '}
          <span className='text-lg font-normal text-[--text-secondary]'>크레딧</span>
        </p>
      </div>

      {/* Stats */}
      <div className='grid grid-cols-2 gap-4'>
        <div
          className='rounded-xl p-4 border'
          style={{ backgroundColor: 'var(--surface-1)', borderColor: 'var(--border-subtle)' }}
        >
          <div className='flex items-center gap-2 mb-2'>
            <TrendingUp size={16} style={{ color: 'var(--success, #22c55e)' }} />
            <span className='text-xs text-[--text-secondary]'>총 충전</span>
          </div>
          <p className='text-lg font-semibold text-[--text-primary]'>
            {stats.totalPurchased.toLocaleString()}
          </p>
        </div>
        <div
          className='rounded-xl p-4 border'
          style={{ backgroundColor: 'var(--surface-1)', borderColor: 'var(--border-subtle)' }}
        >
          <div className='flex items-center gap-2 mb-2'>
            <TrendingDown size={16} className='text-[--error]' />
            <span className='text-xs text-[--text-secondary]'>총 소모</span>
          </div>
          <p className='text-lg font-semibold text-[--text-primary]'>
            {stats.totalConsumed.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Transaction History */}
      <div
        className='rounded-2xl border overflow-hidden'
        style={{ backgroundColor: 'var(--surface-1)', borderColor: 'var(--border-subtle)' }}
      >
        <div className='px-5 py-4 border-b' style={{ borderColor: 'var(--border-subtle)' }}>
          <h2 className='text-sm font-semibold text-[--text-primary]'>사용 내역</h2>
        </div>

        {loading ? (
          <div className='p-8 text-center text-sm text-[--text-secondary]'>로딩 중...</div>
        ) : transactions.length === 0 ? (
          <div className='p-8 text-center text-sm text-[--text-secondary]'>
            아직 사용 내역이 없습니다.
          </div>
        ) : (
          <div className='divide-y' style={{ borderColor: 'var(--border-subtle)' }}>
            {transactions.map((tx) => (
              <div key={tx.id} className='px-5 py-3 flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                  <span
                    className='text-[10px] font-medium px-2 py-0.5 rounded-full'
                    style={{
                      backgroundColor: `color-mix(in srgb, ${TYPE_COLORS[tx.type]} 15%, transparent)`,
                      color: TYPE_COLORS[tx.type],
                    }}
                  >
                    {TYPE_LABELS[tx.type]}
                  </span>
                  <div>
                    <p className='text-sm text-[--text-primary]'>
                      {tx.description || TYPE_LABELS[tx.type]}
                    </p>
                    <p className='text-xs text-[--text-tertiary]'>
                      {new Date(tx.created_at).toLocaleString('ko-KR')}
                    </p>
                  </div>
                </div>
                <div className='text-right'>
                  <p
                    className='text-sm font-semibold'
                    style={{ color: tx.amount > 0 ? 'var(--success, #22c55e)' : 'var(--error)' }}
                  >
                    {tx.amount > 0 ? '+' : ''}
                    {tx.amount}
                  </p>
                  <p className='text-xs text-[--text-tertiary]'>잔액 {tx.balance_after}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className='px-5 py-3 border-t flex items-center justify-center gap-4' style={{ borderColor: 'var(--border-subtle)' }}>
            <button
              type='button'
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className='p-1 rounded-lg hover:bg-[--surface-2] disabled:opacity-30 transition-colors'
            >
              <ChevronLeft size={16} className='text-[--text-secondary]' />
            </button>
            <span className='text-xs text-[--text-secondary]'>
              {page} / {totalPages}
            </span>
            <button
              type='button'
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className='p-1 rounded-lg hover:bg-[--surface-2] disabled:opacity-30 transition-colors'
            >
              <ChevronRight size={16} className='text-[--text-secondary]' />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
