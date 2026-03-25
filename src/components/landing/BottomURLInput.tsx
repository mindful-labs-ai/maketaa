'use client';

import { useState } from 'react';
import { Globe, Search } from 'lucide-react';

export default function BottomURLInput() {
  const [url, setUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Scroll to top where the main hero handles the full flow
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Dispatch custom event so LandingHero can pick up the URL
    window.dispatchEvent(
      new CustomEvent('landing-url-submit', { detail: url }),
    );
  };

  return (
    <form onSubmit={handleSubmit} className='max-w-xl mx-auto'>
      <div
        className='flex items-center gap-2 p-2 rounded-2xl'
        style={{
          background: 'var(--surface-1)',
          border: '1px solid var(--border-default)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}
      >
        <div className='flex items-center gap-2 flex-1 px-3'>
          <Globe className='w-5 h-5 shrink-0' style={{ color: 'var(--text-tertiary)' }} />
          <input
            type='text'
            placeholder='비즈니스 웹사이트 주소를 입력하세요'
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className='flex-1 bg-transparent outline-none text-sm py-2'
            style={{ color: 'var(--text-primary)' }}
          />
        </div>
        <button
          type='submit'
          className='shrink-0 flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.99]'
          style={{
            background: 'linear-gradient(135deg, #7C5CFC 0%, #5B8DEF 100%)',
            color: '#fff',
            boxShadow: '0 4px 20px rgba(124,92,252,0.35)',
          }}
        >
          <Search className='w-4 h-4' />
          전략 분석받기
        </button>
      </div>
    </form>
  );
}
