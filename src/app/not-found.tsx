'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Home, ArrowLeft, HelpCircle, Sparkles } from 'lucide-react';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className='min-h-screen flex flex-col bg-[--surface-0]'>
      {/* Top bar */}
      <header className='flex justify-between items-center px-6 h-16 border-b border-[--border-subtle] bg-[--surface-0]/80 backdrop-blur-xl'>
        <span
          className='text-xl font-bold'
          style={{
            background: 'linear-gradient(90deg, #7C5CFC, #5B8DEF)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Maketaa
        </span>
        <button className='text-[--text-secondary] hover:text-[--text-primary] transition-colors p-2 rounded-lg hover:bg-[--surface-2]'>
          <HelpCircle size={20} />
        </button>
      </header>

      {/* Center content */}
      <main className='flex-1 flex flex-col items-center justify-center px-6 text-center relative'>
        {/* Background glow */}
        <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[--brand-primary]/5 rounded-full blur-[120px] pointer-events-none' />

        <div className='relative z-10 flex flex-col items-center max-w-2xl w-full'>
          {/* 404 number */}
          <div
            className='select-none font-bold tracking-tighter leading-none mb-6 text-[--text-tertiary] opacity-50'
            style={{ fontSize: '8rem' }}
          >
            404
          </div>

          {/* Heading */}
          <h1 className='text-2xl font-bold text-[--text-primary] mb-3'>
            페이지를 찾을 수 없습니다
          </h1>

          {/* Description */}
          <p className='text-[--text-secondary] mb-8 max-w-md'>
            요청하신 페이지가 존재하지 않거나 이동되었습니다
          </p>

          {/* Buttons */}
          <div className='flex flex-col sm:flex-row items-center justify-center gap-4 mb-16'>
            <Link
              href='/'
              className='flex items-center gap-2 px-8 py-3.5 rounded-lg font-semibold text-white transition-all active:scale-95 shadow-[0_4px_20px_rgba(124,92,252,0.2)]'
              style={{ background: 'linear-gradient(135deg, #7C5CFC 0%, #5B8DEF 100%)' }}
            >
              <Home size={18} />
              홈으로 돌아가기
            </Link>
            <button
              onClick={() => router.back()}
              className='flex items-center gap-2 px-8 py-3.5 rounded-lg font-medium text-[--text-primary] bg-[--surface-2] border border-[--border-default]/40 hover:bg-[--surface-3] transition-all active:scale-95'
            >
              <ArrowLeft size={18} />
              이전 페이지로
            </button>
          </div>

          {/* Tip card */}
          <div className='p-4 rounded-xl bg-[--surface-2] border-l-2 border-[--brand-primary] border border-[--brand-primary]/10 max-w-sm w-full'>
            <div className='flex items-start gap-3 text-left'>
              <Sparkles size={18} className='text-[--brand-primary] mt-0.5 shrink-0' />
              <div>
                <p className='text-xs font-semibold text-[--brand-primary] uppercase tracking-widest mb-1'>
                  Curator Tip
                </p>
                <p className='text-xs text-[--text-secondary] leading-relaxed'>
                  원하시는 정보를 찾으려면 상단의 검색 아이콘을 이용하거나 대시보드에서 최근 프로젝트를 확인해 보세요.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className='py-6 text-center'>
        <p className='text-[10px] text-[--text-tertiary] tracking-[0.2em] uppercase'>
          © 2026 MAKETAA. ALL RIGHTS RESERVED.
        </p>
      </footer>
    </div>
  );
}
