'use client';

import Link from 'next/link';
import { RefreshCw, Home } from 'lucide-react';

export default function Error({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className='min-h-screen flex flex-col items-center justify-center bg-[--surface-0] text-center px-6 relative'>
      {/* Background decoration */}
      <div className='fixed inset-0 z-0 pointer-events-none'>
        <div className='absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[--brand-primary] opacity-[0.03] blur-[120px]' />
        <div className='absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[--brand-secondary] opacity-[0.03] blur-[120px]' />
      </div>

      <div className='relative z-10 flex flex-col items-center max-w-lg w-full'>
        {/* System Response label */}
        <span className='text-xs text-[--text-tertiary] tracking-[0.2em] uppercase font-medium mb-4 block'>
          System Response
        </span>

        {/* 500 number */}
        <h1
          className='font-bold leading-none tracking-tighter select-none opacity-80 bg-gradient-to-r from-[--brand-primary] to-[--brand-secondary] bg-clip-text text-transparent mb-8'
          style={{ fontSize: '8rem' }}
        >
          500
        </h1>

        {/* Heading */}
        <h2 className='text-2xl font-bold text-[--text-primary] mb-4'>
          서버 오류가 발생했습니다
        </h2>

        {/* Description */}
        <p className='text-[--text-secondary] leading-relaxed mb-10 max-w-md'>
          잠시 후 다시 시도해주세요. 시스템이 현재 안정화 작업을 진행 중이거나 예기치 않은 오류가 발생했습니다.
        </p>

        {/* Buttons */}
        <div className='flex flex-col sm:flex-row items-center gap-4 w-full max-w-sm mb-16'>
          <button
            onClick={reset}
            className='w-full flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-white transition-all active:scale-[0.98] shadow-[0_0_20px_rgba(124,92,252,0.15)]'
            style={{ background: 'linear-gradient(135deg, #7C5CFC 0%, #5B8DEF 100%)' }}
          >
            <RefreshCw size={18} />
            다시 시도
          </button>
          <Link
            href='/'
            className='w-full flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-medium text-[--text-primary] bg-[--surface-2]/50 border border-[--border-default]/40 hover:bg-[--surface-2] transition-all active:scale-[0.98]'
          >
            <Home size={18} />
            홈으로
          </Link>
        </div>

        {/* Info card */}
        <div className='p-6 rounded-xl bg-[--surface-2] border border-[--border-default]/40 w-full flex items-start gap-4 text-left'>
          <div className='p-2 rounded-lg bg-[--brand-primary]/10 text-[--brand-primary] shrink-0'>
            <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
              <circle cx='12' cy='12' r='10' />
              <line x1='12' y1='8' x2='12' y2='12' />
              <line x1='12' y1='16' x2='12.01' y2='16' />
            </svg>
          </div>
          <div>
            <p className='text-sm font-semibold text-[--text-primary] mb-1'>상태 정보</p>
            <p className='text-xs text-[--text-secondary] leading-relaxed'>
              현재 구간 장애 또는 긴급 기능으로 연결되었습니다. 서버의 데이터는 안전하게 보호되고 있으며, 가능한 한 빨리 서비스를 복구하도록 하겠습니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
