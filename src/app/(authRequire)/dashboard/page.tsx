'use client';

// Dashboard page matching Stitch design
// Layout: Sidebar + TopNav are provided by (authRequire)/layout.tsx - don't add them here

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Clapperboard,
  Video,
  Image as ImageIcon,
  Sparkles,
  MessageSquare,
  Newspaper,
  Plus,
  Search,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { AssetHistory } from '@/types/asset-history';
import type { CardSpecRecord } from '@/lib/card-news/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FilterTab = '전체' | '비디오' | '카드뉴스' | '이미지';

type ProjectItem = {
  id: string;
  type: 'image' | 'video' | 'card-news';
  title: string;
  thumbnail?: string;
  service?: string;
  status?: string;
  created_at: string;
  href: string;
  /** Card-news fallback gradient when no cover image */
  gradient?: string;
  /** Card-news cover headline for gradient fallback */
  headline?: string;
  /** Card count for card-news */
  cardCount?: number;
};

// ---------------------------------------------------------------------------
// Quick-action data
// ---------------------------------------------------------------------------

const QUICK_ACTIONS = [
  {
    label: '숏폼 영상 만들기',
    description: 'SNS 인증 숏폼 제작',
    href: '/makerScript',
    Icon: Clapperboard,
    iconBg: 'bg-violet-500/20',
    iconColor: 'text-violet-400',
  },
  {
    label: '비디오 생성',
    description: 'AI 비디오 엔진 구동',
    href: '/video',
    Icon: Video,
    iconBg: 'bg-blue-500/20',
    iconColor: 'text-blue-400',
  },
  {
    label: '이미지 생성',
    description: '고퀄리티 결과 이미지',
    href: '/image',
    Icon: ImageIcon,
    iconBg: 'bg-teal-500/20',
    iconColor: 'text-teal-400',
  },
  {
    label: 'GIF 만들기',
    description: '움직이는 배너 제작',
    href: '/gif',
    Icon: Sparkles,
    iconBg: 'bg-yellow-500/20',
    iconColor: 'text-yellow-400',
  },
  {
    label: '인스타 헬퍼',
    description: '인스타그램 최적화 도구',
    href: '/insta',
    Icon: MessageSquare,
    iconBg: 'bg-pink-500/20',
    iconColor: 'text-pink-400',
  },
  {
    label: '카드뉴스 만들기',
    description: '정보성 콘텐츠 레이아웃',
    href: '/card-news/create',
    Icon: Newspaper,
    iconBg: 'bg-green-500/20',
    iconColor: 'text-green-400',
  },
] as const;

// ---------------------------------------------------------------------------
// Filter tabs
// ---------------------------------------------------------------------------

const FILTER_TABS: FilterTab[] = ['전체', '비디오', '카드뉴스', '이미지'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function assetToProject(a: AssetHistory): ProjectItem {
  return {
    id: a.id,
    type: a.asset_type,
    title: a.original_content || (a.asset_type === 'image' ? '이미지' : '비디오'),
    thumbnail: a.asset_type === 'image' ? a.storage_url : undefined,
    service: a.metadata?.service as string | undefined,
    created_at: a.created_at,
    href: `/history`,
  };
}

function cardToProject(c: CardSpecRecord): ProjectItem {
  const coverCard = c.spec?.cards?.[0];
  const coverSrc = coverCard?.background?.src;
  const palette = coverCard?.style?.color_palette;

  return {
    id: c.id,
    type: 'card-news',
    title: c.topic || '카드뉴스',
    thumbnail: coverSrc || undefined,
    status: c.status,
    created_at: c.created_at,
    href: `/card-news/editor/${c.id}`,
    gradient: !coverSrc
      ? `linear-gradient(135deg, ${palette?.primary ?? '#374151'}, ${palette?.secondary ?? '#6b7280'})`
      : undefined,
    headline: !coverSrc ? coverCard?.text?.headline : undefined,
    cardCount: c.spec?.cards?.length ?? 0,
  };
}

const TYPE_ICON = {
  image: ImageIcon,
  video: Video,
  'card-news': Newspaper,
} as const;

const TYPE_LABEL = {
  image: '이미지',
  video: '비디오',
  'card-news': '카드뉴스',
} as const;

const STATUS_LABEL: Record<string, string> = {
  draft: '초안',
  review: '검토 중',
  approved: '승인됨',
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function QuickActions() {
  return (
    <div className='mt-10'>
      <h2 className='text-base font-semibold text-[--text-primary] mb-4'>빠른 시작</h2>
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
        {QUICK_ACTIONS.map(({ label, description, href, Icon, iconBg, iconColor }) => (
          <Link
            key={href}
            href={href}
            className='flex items-center gap-4 rounded-xl px-5 py-7 transition-colors group'
            style={{ backgroundColor: 'var(--surface-2)' }}
          >
            <div
              className={[
                'flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0',
                iconBg,
              ].join(' ')}
            >
              <Icon className={['w-5 h-5', iconColor].join(' ')} />
            </div>
            <div>
              <p className='text-sm font-semibold text-[--text-primary] group-hover:text-white transition-colors'>
                {label}
              </p>
              <p className='text-xs text-[--text-secondary] mt-0.5'>{description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className='flex flex-col items-center justify-center py-16 gap-3'>
      <div className='flex items-center justify-center w-16 h-16 rounded-full bg-[--surface-2] mb-2'>
        <Sparkles className='w-7 h-7 text-[--brand-primary]' />
      </div>

      <h2 className='text-xl font-semibold text-[--text-primary]'>
        아직 프로젝트가 없습니다
      </h2>
      <p className='text-sm text-[--text-secondary]'>
        첫 번째 AI 마케팅 콘텐츠를 만들어보세요
      </p>
    </div>
  );
}

function ProjectCard({ item }: { item: ProjectItem }) {
  const router = useRouter();
  const Icon = TYPE_ICON[item.type];

  return (
    <button
      type='button'
      onClick={() => router.push(item.href)}
      className='text-left rounded-xl overflow-hidden transition-all hover:ring-1 hover:ring-[--brand-primary]/40'
      style={{ backgroundColor: 'var(--surface-2)' }}
    >
      {/* Thumbnail / placeholder */}
      <div
        className='aspect-video w-full bg-[--surface-1] relative overflow-hidden'
        style={item.gradient ? { background: item.gradient } : undefined}
      >
        {item.thumbnail ? (
          <img src={item.thumbnail} alt={item.title} className='w-full h-full object-cover' />
        ) : item.gradient ? (
          <>
            {item.headline && (
              <div className='absolute inset-0 flex items-center justify-center p-4'>
                <p className='text-white/80 text-sm font-medium text-center line-clamp-3'>
                  {item.headline}
                </p>
              </div>
            )}
            {item.cardCount != null && item.cardCount > 0 && (
              <div className='absolute bottom-2 right-2 bg-black/60 text-white text-[11px] font-medium px-2 py-0.5 rounded-md backdrop-blur-sm'>
                {item.cardCount}장
              </div>
            )}
          </>
        ) : (
          <div className='w-full h-full flex items-center justify-center'>
            <Icon className='w-10 h-10 text-[--text-tertiary]' />
          </div>
        )}
      </div>

      {/* Info */}
      <div className='p-4'>
        <p className='text-sm font-semibold text-[--text-primary] line-clamp-2'>{item.title}</p>
        <div className='flex items-center gap-2 mt-2'>
          <span className='text-xs px-2 py-0.5 rounded-full bg-[--surface-1] text-[--text-secondary]'>
            {TYPE_LABEL[item.type]}
          </span>
          {item.service && (
            <span className='text-xs px-2 py-0.5 rounded-full bg-[--surface-1] text-[--text-secondary]'>
              {item.service}
            </span>
          )}
          {item.status && (
            <span className='text-xs px-2 py-0.5 rounded-full bg-[--surface-1] text-[--text-secondary]'>
              {STATUS_LABEL[item.status] || item.status}
            </span>
          )}
        </div>
        <p className='text-xs text-[--text-tertiary] mt-2'>
          {new Date(item.created_at).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </p>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<FilterTab>('전체');
  const [searchQuery, setSearchQuery] = useState('');
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const supabase = createClient();

      const [assetsRes, cardsRes] = await Promise.all([
        supabase
          .from('asset_history')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('card_specs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50),
      ]);

      const items: ProjectItem[] = [];

      if (assetsRes.data) {
        items.push(...assetsRes.data.map(assetToProject));
      }
      if (cardsRes.data) {
        items.push(...cardsRes.data.map(cardToProject));
      }

      items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setProjects(items);
      setLoading(false);
    }

    load();
  }, []);

  const filtered = useMemo(() => {
    let list = projects;

    if (activeTab === '비디오') list = list.filter(p => p.type === 'video');
    else if (activeTab === '카드뉴스') list = list.filter(p => p.type === 'card-news');
    else if (activeTab === '이미지') list = list.filter(p => p.type === 'image');

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(p => p.title.toLowerCase().includes(q));
    }

    return list;
  }, [projects, activeTab, searchQuery]);

  return (
    <div>
      {/* 1. Header row */}
      <div className='px-6 pt-6 pb-4'>
        <div className='flex items-center justify-between'>
          <h1 className='text-2xl font-bold text-[--text-primary]'>내 프로젝트</h1>
          <Link
            href='/card-news/create'
            className='inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white'
            style={{
              background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
            }}
          >
            <Plus className='w-4 h-4' />
            새 프로젝트
          </Link>
        </div>
      </div>

      <div className='px-6'>
      {/* 2. Filter tabs */}
      <div className='flex items-center gap-2 flex-wrap mb-5'>
        {FILTER_TABS.map(tab => (
          <button
            key={tab}
            type='button'
            onClick={() => setActiveTab(tab)}
            className={[
              'px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all duration-150',
              activeTab === tab
                ? 'bg-primary text-primary-foreground border-primary shadow-[0_0_0_3px_rgba(124,92,252,0.15)]'
                : 'bg-[--surface-2] border-[--border-subtle] text-[--text-secondary] hover:border-[--accent] hover:text-[--text-primary]',
            ].join(' ')}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* 3. Search + Sort row */}
      <div className='flex items-center gap-3 mb-7'>
        <div className='relative flex-1 max-w-xs'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--text-tertiary]' />
          <input
            type='text'
            placeholder='프로젝트 검색'
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className='w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-[--surface-1] border border-[--border-default] text-[--text-primary] placeholder:text-[--text-tertiary] focus:outline-none focus:border-[--brand-primary] transition-colors'
          />
        </div>
        <button
          type='button'
          className='flex items-center gap-1 px-3 py-2 text-sm text-[--text-secondary] border border-[--border-default] rounded-lg hover:text-[--text-primary] transition-colors'
        >
          최신순
          <svg
            className='w-3.5 h-3.5 ml-0.5'
            viewBox='0 0 16 16'
            fill='none'
            xmlns='http://www.w3.org/2000/svg'
          >
            <path
              d='M4 6l4 4 4-4'
              stroke='currentColor'
              strokeWidth='1.5'
              strokeLinecap='round'
              strokeLinejoin='round'
            />
          </svg>
        </button>
      </div>

      {/* 4. Content */}
      {loading ? (
        <div className='flex items-center justify-center py-16'>
          <div className='w-6 h-6 border-2 border-[--brand-primary] border-t-transparent rounded-full animate-spin' />
        </div>
      ) : filtered.length > 0 ? (
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
          {filtered.map(item => (
            <ProjectCard key={item.id} item={item} />
          ))}
        </div>
      ) : projects.length > 0 ? (
        <div className='flex flex-col items-center justify-center py-16 gap-2'>
          <Search className='w-8 h-8 text-[--text-tertiary]' />
          <p className='text-sm text-[--text-secondary]'>검색 결과가 없습니다</p>
        </div>
      ) : (
        <EmptyState />
      )}

      {/* Quick actions — always visible */}
      {!loading && <QuickActions />}
      </div>
    </div>
  );
}
