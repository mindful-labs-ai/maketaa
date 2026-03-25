'use client';

import { useRouter } from 'next/navigation';
import { useInsufficientCreditsDialog } from '@/lib/credits/useInsufficientCreditsHandler';
import { Coins, ArrowRight } from 'lucide-react';

export function InsufficientCreditsDialog() {
  const router = useRouter();
  const open = useInsufficientCreditsDialog(s => s.open);
  const balance = useInsufficientCreditsDialog(s => s.balance);
  const required = useInsufficientCreditsDialog(s => s.required);
  const close = useInsufficientCreditsDialog(s => s.close);

  if (!open) return null;

  return (
    // Full-screen overlay
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={close}
      />

      {/* Dialog */}
      <div
        className="relative z-10 w-full max-w-sm mx-4 rounded-2xl border p-6"
        style={{
          backgroundColor: 'var(--surface-1)',
          borderColor: 'var(--border-default)',
        }}
      >
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
          >
            <Coins size={24} className="text-[--error]" />
          </div>
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-center text-[--text-primary] mb-2">
          크레딧이 부족합니다
        </h3>

        {/* Info */}
        <div
          className="rounded-xl p-4 mb-5 space-y-2"
          style={{ backgroundColor: 'var(--surface-2)' }}
        >
          <div className="flex justify-between text-sm">
            <span className="text-[--text-secondary]">현재 잔액</span>
            <span className="font-medium text-[--text-primary]">{balance} 크레딧</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[--text-secondary]">필요 크레딧</span>
            <span className="font-medium text-[--error]">{required} 크레딧</span>
          </div>
          <div
            className="border-t pt-2 flex justify-between text-sm"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <span className="text-[--text-secondary]">부족분</span>
            <span className="font-semibold text-[--error]">
              {required - balance} 크레딧
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={close}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors hover:bg-[--surface-2]"
            style={{
              borderColor: 'var(--border-default)',
              color: 'var(--text-secondary)',
            }}
          >
            닫기
          </button>
          <button
            type="button"
            onClick={() => {
              close();
              router.push('/credits/charge');
            }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{
              background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
            }}
          >
            충전하기
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
