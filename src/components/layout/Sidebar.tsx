'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Clapperboard,
  Video,
  Image,
  Images,
  MessageSquare,
  Newspaper,
  Sparkles,
  History,
  Settings,
  LogOut,
  LayoutDashboard,
  Menu,
  X,
  FileBarChart,
  Coins,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/shared/useAuthStore';
import { useCreditStore } from '@/lib/credits/useCreditStore';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

const NAV_LINKS = [
  { href: '/dashboard', label: '대시보드', icon: LayoutDashboard },
  { href: '/reports', label: '마케팅 리포트', icon: FileBarChart },
  { href: '/makerScript', label: '숏폼 영상', icon: Clapperboard },
  { href: '/video', label: '비디오 생성', icon: Video },
  { href: '/image', label: '이미지 생성', icon: Image },
  { href: '/image-parallel', label: '병렬 이미지', icon: Images },
  { href: '/insta', label: '인스타 헬퍼', icon: MessageSquare },
  { href: '/card-news', label: '카드뉴스', icon: Newspaper },
  { href: '/gif', label: 'GIF 스튜디오', icon: Sparkles },
  { href: '/history', label: '생성 히스토리', icon: History },
] as const;

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const userEmail = useAuthStore((s) => s.userEmail);
  const creditBalance = useCreditStore((s) => s.balance);

  const handleLogout = async () => {
    await createClient().auth.signOut();
    router.push('/login');
  };

  return (
    <div className='flex flex-col h-full py-6 px-4'>
      {/* Logo */}
      <div className='mb-10 px-2'>
        <h1 className='text-xl font-bold tracking-tight text-[--text-primary]'>
          Mak
          <span
            style={{
              background: 'linear-gradient(90deg, #7C5CFC, #5B8DEF)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            etaa
          </span>
        </h1>
        <p className='text-xs text-[--text-secondary] mt-0.5'>AI Marketing Tool</p>
      </div>

      {/* Nav Links */}
      <nav className='flex-1 space-y-1 overflow-y-auto'>
        {NAV_LINKS.map((link) => {
          const active =
            link.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(link.href);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onNavigate}
              className={[
                'relative flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200',
                active
                  ? 'bg-[--surface-2] text-[--text-primary]'
                  : 'text-[--text-secondary] hover:bg-[--surface-2] hover:text-[--text-primary]',
              ].join(' ')}
            >
              {active && (
                <span className='absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[--brand-primary]' />
              )}
              <Icon size={18} strokeWidth={2} />
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: Credits + Settings + User */}
      <div className='mt-auto pt-4 border-t border-[--border-subtle] space-y-1'>
        <Link
          href='/credits'
          onClick={onNavigate}
          className='flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-[--text-secondary] hover:bg-[--surface-2] hover:text-[--text-primary] rounded-lg transition-colors'
        >
          <Coins size={18} strokeWidth={2} />
          <span className='flex-1'>크레딧</span>
          {creditBalance !== null && (
            <span className='text-xs font-semibold px-2 py-0.5 rounded-full bg-[--surface-3] text-[--brand-primary]'>
              {creditBalance.toLocaleString()}
            </span>
          )}
        </Link>
        <Link
          href='/settings'
          onClick={onNavigate}
          className='flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-[--text-secondary] hover:bg-[--surface-2] hover:text-[--text-primary] rounded-lg transition-colors'
        >
          <Settings size={18} strokeWidth={2} />
          설정
        </Link>

        {userEmail && (
          <div className='px-3 py-2'>
            <p className='text-xs text-[--text-secondary] truncate'>{userEmail}</p>
          </div>
        )}

        <button
          type='button'
          onClick={handleLogout}
          className='flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-[--text-secondary] hover:bg-[--surface-2] hover:text-[--error] rounded-lg transition-colors'
        >
          <LogOut size={18} strokeWidth={2} />
          로그아웃
        </button>
      </div>
    </div>
  );
}

/** Desktop: fixed sidebar. Mobile: hidden (use MobileSidebar). */
export function Sidebar() {
  return (
    <aside className='hidden lg:flex fixed left-0 top-0 z-40 w-56 h-screen flex-col' style={{ backgroundColor: 'var(--surface-1)', borderRight: '1px solid var(--border-subtle)' }}>
      <SidebarContent />
    </aside>
  );
}

/** Mobile sidebar trigger + Sheet */
export function MobileSidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant='ghost'
          size='icon'
          className='lg:hidden text-[--text-secondary] hover:text-[--text-primary]'
        >
          <Menu size={20} />
          <span className='sr-only'>메뉴 열기</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        side='left'
        className='border-[--border-default] w-56 p-0'
        style={{ backgroundColor: 'var(--surface-1)' }}
      >
        <SidebarContent onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}

export default Sidebar;
