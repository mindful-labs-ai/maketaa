'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { User, LogOut, Settings, Bell, HelpCircle, ArrowLeft, Coins } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/shared/useAuthStore';
import { useCreditStore } from '@/lib/credits/useCreditStore';
import { useCardSpecMeta } from '@/stores/card-news/useCardStore';
import { MobileSidebar } from './Sidebar';

function UserMenu() {
  const [open, setOpen] = useState(false);
  const userEmail = useAuthStore((s) => s.userEmail);
  const router = useRouter();

  const handleLogout = async () => {
    await createClient().auth.signOut();
    router.push('/login');
  };

  return (
    <div className='relative'>
      <button
        type='button'
        onClick={() => setOpen((v) => !v)}
        className='flex items-center justify-center w-8 h-8 rounded-full bg-[--surface-3] hover:bg-[--surface-2] transition-colors'
      >
        <User size={16} className='text-[--text-secondary]' />
      </button>

      {open && (
        <>
          <div
            className='fixed inset-0 z-40'
            onClick={() => setOpen(false)}
            aria-hidden='true'
          />
          <div className='absolute right-0 top-full mt-2 z-50 w-52 rounded-xl border border-[--border-default] bg-[--surface-1] shadow-xl py-1 backdrop-blur-xl'>
            {userEmail && (
              <div className='px-4 py-3 border-b border-[--border-subtle]'>
                <p className='text-xs text-[--text-secondary] truncate'>
                  {userEmail}
                </p>
              </div>
            )}
            <Link
              href='/settings'
              onClick={() => setOpen(false)}
              className='flex items-center gap-2.5 px-4 py-2.5 text-sm text-[--text-primary] hover:bg-[--surface-2] transition-colors'
            >
              <Settings size={15} strokeWidth={2} />
              설정
            </Link>
            <button
              type='button'
              onClick={handleLogout}
              className='flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-[--error] hover:bg-[--surface-2] transition-colors'
            >
              <LogOut size={15} strokeWidth={2} />
              로그아웃
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function CreditBadge() {
  const balance = useCreditStore((s) => s.balance);
  const router = useRouter();

  if (balance === null) return null;

  return (
    <button
      type='button'
      onClick={() => router.push('/credits')}
      className='hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-[--surface-2] transition-colors'
      style={{ color: 'var(--text-secondary)' }}
    >
      <Coins size={14} className='text-[--brand-primary]' />
      <span className='font-semibold text-[--text-primary]'>{balance.toLocaleString()}</span>
    </button>
  );
}

export function TopNav({ title, backHref }: { title?: string; backHref?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const isCardEditor = pathname.startsWith('/card-news/editor/');
  const cardMeta = useCardSpecMeta();

  const resolvedBackHref = backHref ?? (isCardEditor ? '/card-news' : undefined);
  const resolvedTitle = title ?? (isCardEditor ? (cardMeta?.topic || '카드뉴스 편집') : undefined);

  return (
    <header className='sticky top-0 z-30 h-14 border-b flex items-center px-4 lg:px-6 gap-4' style={{ backgroundColor: 'var(--surface-0)', borderColor: 'var(--border-subtle)' }}>
      {/* Mobile: hamburger */}
      <MobileSidebar />

      {/* Back button */}
      {resolvedBackHref && (
        <button
          type='button'
          onClick={() => router.push(resolvedBackHref)}
          className='flex items-center justify-center w-8 h-8 rounded-lg text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--surface-2] transition-colors'
          aria-label='뒤로가기'
        >
          <ArrowLeft size={16} strokeWidth={2} />
        </button>
      )}

      {/* Mobile: centered logo (hide when back button shown) */}
      {!resolvedBackHref && (
        <div className='lg:hidden flex-1 text-center'>
          <Link
            href='/dashboard'
            className='font-bold text-lg bg-gradient-to-r from-[--brand-primary] to-[--brand-secondary] bg-clip-text text-transparent'
          >
            Maketaa
          </Link>
        </div>
      )}

      {/* Page title */}
      {resolvedTitle && (
        <h2 className='text-sm font-medium text-[--text-primary] truncate'>
          {resolvedTitle}
        </h2>
      )}

      {/* Spacer */}
      <div className='hidden lg:block flex-1' />

      {/* Right actions */}
      <div className='flex items-center gap-2'>
        <CreditBadge />
        <button
          type='button'
          className='hidden lg:flex items-center justify-center w-8 h-8 rounded-lg text-[--text-tertiary] hover:text-[--text-secondary] hover:bg-[--surface-2] transition-colors'
        >
          <Bell size={16} strokeWidth={2} />
        </button>
        <button
          type='button'
          className='hidden lg:flex items-center justify-center w-8 h-8 rounded-lg text-[--text-tertiary] hover:text-[--text-secondary] hover:bg-[--surface-2] transition-colors'
        >
          <HelpCircle size={16} strokeWidth={2} />
        </button>
        <UserMenu />
      </div>
    </header>
  );
}

export default TopNav;
