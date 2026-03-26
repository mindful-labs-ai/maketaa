'use client';

import { useState } from 'react';
import { Play, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';

type Category = 'all' | 'shortform' | 'cardnews';

interface ShowcaseItem {
  type: 'shortform' | 'cardnews';
  title: string;
  industry: string;
  description: string;
  image: string;
}

const SHOWCASE_ITEMS: ShowcaseItem[] = [
  {
    type: 'shortform',
    title: '신메뉴 출시 홍보 릴스',
    industry: '카페 / F&B',
    description: 'AI가 메뉴 특징을 분석해 15초 숏폼 자동 제작. 음성 내레이션과 자막까지.',
    image: '/showcase/cafe-reel.png',
  },
  {
    type: 'cardnews',
    title: '시즌 할인 안내 카드뉴스',
    industry: '패션 쇼핑몰',
    description: '할인율, 대표 상품, CTA를 포함한 5장 카드뉴스를 AI가 구성.',
    image: '/showcase/fashion-sale.png',
  },
  {
    type: 'shortform',
    title: '운동 루틴 소개 영상',
    industry: '피트니스 / 헬스',
    description: 'PT 프로그램 핵심 포인트를 강조한 동기부여형 숏폼 콘텐츠.',
    image: '/showcase/fitness-video.png',
  },
  {
    type: 'cardnews',
    title: '포트폴리오 하이라이트',
    industry: '디자인 에이전시',
    description: '대표 프로젝트를 시각적으로 정리한 브랜드 소개 카드뉴스.',
    image: '/showcase/design-portfolio.png',
  },
  {
    type: 'shortform',
    title: '제품 사용법 튜토리얼',
    industry: '뷰티 / 화장품',
    description: 'Before & After 구성으로 제품 효과를 임팩트있게 전달하는 숏폼.',
    image: '/showcase/beauty-tutorial.png',
  },
  {
    type: 'cardnews',
    title: '고객 후기 모음 카드',
    industry: '온라인 교육',
    description: '수강 후기와 성과 데이터를 카드뉴스로 정리해 신뢰도 UP.',
    image: '/showcase/education-review.png',
  },
];

const TABS: { key: Category; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'shortform', label: '숏폼 영상' },
  { key: 'cardnews', label: '카드뉴스' },
];

export default function ContentShowcase() {
  const [activeTab, setActiveTab] = useState<Category>('all');

  const filtered = activeTab === 'all'
    ? SHOWCASE_ITEMS
    : SHOWCASE_ITEMS.filter((item) => item.type === activeTab);

  return (
    <section className='px-6 py-20 md:px-12' style={{ background: 'var(--surface-0)' }}>
      <div className='max-w-5xl mx-auto'>
        <div className='text-center mb-10'>
          <h2
            className='text-2xl md:text-3xl font-bold mb-3'
            style={{ color: 'var(--text-primary)' }}
          >
            이런 콘텐츠를 만들 수 있어요
          </h2>
          <p className='text-base' style={{ color: 'var(--text-secondary)' }}>
            다양한 업종에서 활용되는 마케타의 콘텐츠 Best Case
          </p>
        </div>

        {/* Tabs */}
        <div className='flex items-center justify-center gap-2 mb-10' role='tablist'>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              role='tab'
              aria-selected={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
              className='px-4 py-2 rounded-lg text-sm font-medium transition-all'
              style={{
                background: activeTab === tab.key
                  ? 'linear-gradient(135deg, #7C5CFC, #5B8DEF)'
                  : 'var(--surface-1)',
                color: activeTab === tab.key ? '#fff' : 'var(--text-secondary)',
                border: activeTab === tab.key
                  ? 'none'
                  : '1px solid var(--border-subtle)',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'>
          {filtered.map((item, i) => (
            <div
              key={i}
              className='rounded-2xl overflow-hidden transition-transform hover:translate-y-[-2px]'
              style={{
                background: 'var(--surface-1)',
                border: '1px solid var(--border-default)',
              }}
            >
              {/* Thumbnail */}
              <div className='relative h-40 overflow-hidden'>
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  className='object-cover'
                  sizes='(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw'
                />
                {/* Overlay icon */}
                <div className='absolute inset-0 flex items-center justify-center'>
                  {item.type === 'shortform' ? (
                    <div className='w-12 h-12 rounded-full flex items-center justify-center' style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(8px)' }}>
                      <Play className='w-5 h-5 text-white ml-0.5' />
                    </div>
                  ) : (
                    <div className='w-12 h-12 rounded-full flex items-center justify-center' style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(8px)' }}>
                      <ImageIcon className='w-5 h-5 text-white' />
                    </div>
                  )}
                </div>
                <span
                  className='absolute top-3 left-3 text-xs font-medium px-2 py-1 rounded-md'
                  style={{ background: 'rgba(0,0,0,0.5)', color: '#fff', backdropFilter: 'blur(4px)' }}
                >
                  {item.type === 'shortform' ? '숏폼' : '카드뉴스'}
                </span>
              </div>

              {/* Info */}
              <div className='p-5'>
                <div className='flex items-center gap-2 mb-2'>
                  <span
                    className='text-xs px-2 py-0.5 rounded-full font-medium'
                    style={{
                      background: 'var(--accent-subtle)',
                      border: '1px solid rgba(167,139,250,0.25)',
                      color: '#A78BFA',
                    }}
                  >
                    {item.industry}
                  </span>
                </div>
                <h3
                  className='text-sm font-semibold mb-1.5'
                  style={{ color: 'var(--text-primary)' }}
                >
                  {item.title}
                </h3>
                <p
                  className='text-xs leading-relaxed'
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
