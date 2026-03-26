import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import LandingHero from '@/components/landing/LandingHero';
import BottomURLInput from '@/components/landing/BottomURLInput';
import ContentShowcase from '@/components/landing/ContentShowcase';
import FAQ from '@/components/landing/FAQ';

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebApplication',
      name: 'Maketaa',
      url: 'https://maketaa.com',
      description:
        'AI로 마케팅 콘텐츠를 쉽고 빠르게. URL만 입력하면 AI가 맞춤 마케팅 전략을 분석하고, 숏폼 영상과 카드뉴스를 자동으로 제작합니다.',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'KRW',
        description: '무료 체험 제공',
      },
      inLanguage: 'ko',
    },
    {
      '@type': 'Organization',
      name: 'Maketaa',
      url: 'https://maketaa.com',
      logo: 'https://maketaa.com/icon.svg',
    },
  ],
};

export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/makerScript');
  }

  return (
    <div className='min-h-screen' style={{ background: 'var(--surface-0)' }}>
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingNav />
      <LandingHero />
      <StatsBar />
      <FeatureCards />
      <ContentShowcase />
      <DetailedFeatures />
      <HowItWorks />
      <Testimonials />
      <FAQ />
      <BottomCTA />
      <Footer />
    </div>
  );
}

function LandingNav() {
  return (
    <nav
      className='sticky top-0 z-50 flex items-center justify-between px-6 py-4 md:px-12'
      style={{
        background: 'rgba(10,10,15,0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      <div className='flex items-center gap-2'>
        <span
          className='text-xl font-bold tracking-tight'
          style={{ color: 'var(--text-primary)' }}
        >
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
        </span>
        <span
          className='text-xs font-medium mt-0.5'
          style={{ color: 'var(--text-tertiary)' }}
        >
          마케타
        </span>
      </div>

      <div className='flex items-center gap-3'>
        <Link
          href='/login'
          className='px-4 py-2 text-sm rounded-lg font-medium transition-colors'
          style={{ color: 'var(--text-secondary)' }}
        >
          로그인
        </Link>
        <Link
          href='/signup'
          className='px-4 py-2 text-sm rounded-lg font-semibold transition-opacity hover:opacity-90'
          style={{
            background: 'linear-gradient(135deg, #7C5CFC, #5B8DEF)',
            color: '#fff',
          }}
        >
          시작하기
        </Link>
      </div>
    </nav>
  );
}

function FeatureCards() {
  const features = [
    {
      icon: '🎬',
      accent: '#5B8DEF',
      accentSubtle: 'rgba(91,141,239,0.12)',
      title: '숏폼 비디오 메이커',
      description:
        'AI가 분석한 전략에 맞춰 스크립트부터 영상까지 자동 생성. 추천된 키 메시지로 바로 제작하세요.',
      bullets: [
        'AI 스크립트 자동 생성',
        '음성 및 음악 추가',
        '자막 자동 삽입',
        '전략 기반 콘텐츠 제작',
      ],
    },
    {
      icon: '📰',
      accent: '#A78BFA',
      accentSubtle: 'rgba(167,139,250,0.12)',
      title: '카드뉴스 메이커',
      description:
        'AI가 추천한 콘텐츠 전략을 카드뉴스로 바로 실행. 디자이너 수준의 결과물을 빠르게.',
      bullets: [
        '다양한 템플릿 제공',
        'AI 카피라이팅',
        '이미지 자동 배치',
        'SNS 최적화 사이즈',
      ],
    },
  ];

  return (
    <section className='px-6 py-20 md:px-12 max-w-5xl mx-auto'>
      <div className='text-center mb-14'>
        <h2
          className='text-2xl md:text-3xl font-bold mb-3'
          style={{ color: 'var(--text-primary)' }}
        >
          AI 분석 전략을 바로 실행하세요
        </h2>
        <p className='text-base' style={{ color: 'var(--text-secondary)' }}>
          분석된 마케팅 전략에 맞는 콘텐츠를 두 가지 도구로 즉시 제작
        </p>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
        {features.map((f) => (
          <div
            key={f.title}
            className='rounded-2xl p-7 flex flex-col gap-5 transition-transform hover:translate-y-[-2px]'
            style={{
              background: 'var(--surface-1)',
              border: '1px solid var(--border-default)',
            }}
          >
            <div className='flex items-start gap-4'>
              <div
                className='w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0'
                style={{ background: f.accentSubtle }}
              >
                {f.icon}
              </div>
              <div>
                <h3
                  className='text-lg font-semibold mb-1'
                  style={{ color: 'var(--text-primary)' }}
                >
                  {f.title}
                </h3>
                <p className='text-sm' style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                  {f.description}
                </p>
              </div>
            </div>

            <ul className='grid grid-cols-2 gap-2 pt-1'>
              {f.bullets.map((b) => (
                <li
                  key={b}
                  className='flex items-center gap-2 text-sm'
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <span
                    className='w-1.5 h-1.5 rounded-full shrink-0'
                    style={{ background: f.accent }}
                  />
                  {b}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      number: '01',
      title: 'URL 입력',
      description: '비즈니스 웹사이트 주소를 입력하세요. 블로그, 쇼핑몰, 서비스 페이지 모두 가능합니다.',
    },
    {
      number: '02',
      title: 'AI 전략 분석',
      description:
        'AI가 비즈니스를 분석하고 타겟 고객, 콘텐츠 유형, 톤앤매너 등 맞춤 마케팅 전략을 설계합니다.',
    },
    {
      number: '03',
      title: '콘텐츠 제작',
      description:
        '추천된 전략에 따라 숏폼 영상, 카드뉴스를 즉시 만들어 SNS에 바로 활용하세요.',
    },
  ];

  return (
    <section
      className='px-6 py-20 md:px-12'
      style={{ background: 'var(--surface-0)' }}
    >
      <div className='max-w-5xl mx-auto'>
        <div className='text-center mb-14'>
          <h2
            className='text-2xl md:text-3xl font-bold mb-3'
            style={{ color: 'var(--text-primary)' }}
          >
            어떻게 사용하나요?
          </h2>
          <p className='text-base' style={{ color: 'var(--text-secondary)' }}>
            단 3단계로 맞춤 마케팅 콘텐츠를 완성하세요
          </p>
        </div>

        <div className='relative grid grid-cols-1 md:grid-cols-3 gap-8'>
          {/* Connector line (desktop only) */}
          <div
            className='hidden md:block absolute top-7 left-[calc(16.6%+1rem)] right-[calc(16.6%+1rem)] h-px'
            style={{ background: 'var(--border-default)' }}
          />

          {steps.map((step, i) => (
            <div key={step.number} className='flex flex-col items-center text-center gap-4 relative'>
              <div
                className='w-14 h-14 rounded-full flex items-center justify-center font-mono text-sm font-bold relative z-10'
                style={{
                  background: i === 1
                    ? 'linear-gradient(135deg, #7C5CFC, #5B8DEF)'
                    : 'var(--surface-2)',
                  border: i === 1 ? 'none' : '1px solid var(--border-default)',
                  color: i === 1 ? '#fff' : 'var(--text-secondary)',
                  boxShadow: i === 1 ? '0 4px 20px rgba(124,92,252,0.4)' : 'none',
                }}
              >
                {step.number}
              </div>
              <div>
                <h3
                  className='text-base font-semibold mb-1.5'
                  style={{ color: 'var(--text-primary)' }}
                >
                  {step.title}
                </h3>
                <p
                  className='text-sm'
                  style={{ color: 'var(--text-secondary)', lineHeight: '1.65' }}
                >
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function StatsBar() {
  const stats = [
    { value: '10,000+', label: '전략 분석 완료', accent: '#7C5CFC' },
    { value: '25,000+', label: '콘텐츠 제작', accent: '#5B8DEF' },
    { value: '30초', label: '평균 분석 시간', accent: '#A78BFA' },
    { value: '4.8/5', label: '사용자 만족도', accent: '#34D399' },
  ];

  return (
    <section
      className='px-6 py-12 md:px-12'
      style={{
        background: 'var(--surface-1)',
        borderTop: '1px solid var(--border-subtle)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      <div className='max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8'>
        {stats.map((stat) => (
          <div key={stat.label} className='text-center'>
            <div
              className='text-2xl md:text-3xl font-bold mb-1'
              style={{ color: stat.accent }}
            >
              {stat.value}
            </div>
            <div
              className='text-sm'
              style={{ color: 'var(--text-secondary)' }}
            >
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function DetailedFeatures() {
  const features = [
    {
      icon: '🎯',
      title: '타겟 고객 분석',
      description: 'AI가 웹사이트를 분석해 핵심 타겟 고객층을 자동으로 파악하고, 맞춤 페르소나를 설계합니다.',
    },
    {
      icon: '💡',
      title: '키 메시지 생성',
      description: '비즈니스의 핵심 가치를 전달하는 마케팅 메시지를 AI가 자동으로 생성합니다.',
    },
    {
      icon: '🎨',
      title: '톤앤매너 추천',
      description: '브랜드와 타겟에 맞는 최적의 커뮤니케이션 스타일을 AI가 분석해 추천합니다.',
    },
    {
      icon: '📊',
      title: '콘텐츠 유형 추천',
      description: '업종과 목표에 따라 숏폼, 카드뉴스, 릴스 등 최적의 콘텐츠 형태를 제안합니다.',
    },
    {
      icon: '🔤',
      title: 'AI 카피라이팅',
      description: '클릭을 유도하는 헤드라인부터 CTA 문구까지, 전환율 높은 카피를 자동 생성합니다.',
    },
    {
      icon: '🚀',
      title: '원클릭 제작',
      description: '분석된 전략을 기반으로 숏폼 영상, 카드뉴스를 클릭 한 번으로 바로 제작합니다.',
    },
  ];

  return (
    <section className='px-6 py-20 md:px-12' style={{ background: 'var(--surface-1)' }}>
      <div className='max-w-5xl mx-auto'>
        <div className='text-center mb-14'>
          <h2
            className='text-2xl md:text-3xl font-bold mb-3'
            style={{ color: 'var(--text-primary)' }}
          >
            AI가 분석하는 마케팅 전략의 모든 것
          </h2>
          <p className='text-base' style={{ color: 'var(--text-secondary)' }}>
            URL 하나로 이 모든 분석이 자동으로 이루어집니다
          </p>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'>
          {features.map((f) => (
            <div
              key={f.title}
              className='rounded-2xl p-6 transition-transform hover:translate-y-[-2px]'
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border-default)',
              }}
            >
              <div className='text-2xl mb-3'>{f.icon}</div>
              <h3
                className='text-base font-semibold mb-2'
                style={{ color: 'var(--text-primary)' }}
              >
                {f.title}
              </h3>
              <p
                className='text-sm leading-relaxed'
                style={{ color: 'var(--text-secondary)' }}
              >
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const testimonials = [
    {
      name: '김서연',
      role: '온라인 쇼핑몰 운영',
      content: '혼자서 쇼핑몰 운영하면서 마케팅까지 하기 정말 힘들었는데, 마케타 덕분에 카드뉴스와 숏폼을 뚝딱 만들 수 있게 됐어요. URL만 넣으면 전략까지 짜주니까 마케팅 고민이 확 줄었어요.',
      stars: 5,
      accent: '#7C5CFC',
    },
    {
      name: '박준호',
      role: '카페 사장님',
      content: '신메뉴 출시할 때마다 디자이너한테 맡기면 시간도 돈도 많이 들었는데, 이제 마케타로 직접 만들어요. AI가 제 카페 스타일에 맞는 톤을 알아서 잡아줘서 만족도가 높습니다.',
      stars: 5,
      accent: '#5B8DEF',
    },
    {
      name: '이하은',
      role: '프리랜서 마케터',
      content: '클라이언트별로 다른 전략을 세워야 하는데, 마케타의 AI 분석이 초안을 잡아줘서 작업 시간이 절반으로 줄었어요. 특히 숏폼 영상 제작 기능이 정말 유용합니다.',
      stars: 5,
      accent: '#A78BFA',
    },
  ];

  return (
    <section className='px-6 py-20 md:px-12' style={{ background: 'var(--surface-1)' }}>
      <div className='max-w-5xl mx-auto'>
        <div className='text-center mb-14'>
          <h2
            className='text-2xl md:text-3xl font-bold mb-3'
            style={{ color: 'var(--text-primary)' }}
          >
            사용자들의 이야기
          </h2>
          <p className='text-base' style={{ color: 'var(--text-secondary)' }}>
            마케타와 함께 마케팅을 시작한 분들의 후기
          </p>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
          {testimonials.map((t) => (
            <div
              key={t.name}
              className='rounded-2xl p-6 flex flex-col gap-4'
              style={{
                background: 'var(--surface-1)',
                border: '1px solid var(--border-default)',
              }}
            >
              {/* Stars */}
              <div className='flex gap-0.5' role='img' aria-label={`5점 만점에 ${t.stars}점`}>
                {Array.from({ length: t.stars }).map((_, i) => (
                  <span key={i} className='text-sm' style={{ color: '#FBBF24' }} aria-hidden='true'>
                    ★
                  </span>
                ))}
              </div>

              {/* Quote */}
              <p
                className='text-sm leading-relaxed flex-1'
                style={{ color: 'var(--text-secondary)' }}
              >
                &ldquo;{t.content}&rdquo;
              </p>

              {/* Author */}
              <div className='flex items-center gap-3 pt-2' style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <div
                  className='w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold'
                  style={{ background: `${t.accent}20`, color: t.accent }}
                >
                  {t.name[0]}
                </div>
                <div>
                  <div
                    className='text-sm font-semibold'
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {t.name}
                  </div>
                  <div
                    className='text-xs'
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {t.role}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BottomCTA() {
  return (
    <section className='px-6 py-24 md:px-12 text-center' style={{ background: 'var(--surface-0)' }}>
      <div className='max-w-2xl mx-auto'>
        <h2
          className='text-3xl md:text-4xl font-bold mb-4'
          style={{ color: 'var(--text-primary)' }}
        >
          내 비즈니스에 맞는 마케팅 전략,
          <br />
          지금 무료로 받아보세요
        </h2>
        <p
          className='text-base mb-10'
          style={{ color: 'var(--text-secondary)' }}
        >
          웹사이트 주소만 입력하면 AI가 맞춤 콘텐츠 전략을 설계합니다.
        </p>
        <BottomURLInput />
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer
      className='px-6 py-8 md:px-12 flex flex-col md:flex-row items-center justify-between gap-4 text-sm'
      style={{
        borderTop: '1px solid var(--border-subtle)',
        color: 'var(--text-tertiary)',
        background: 'var(--surface-0)',
      }}
    >
      <span>&copy; 2026 Maketaa. All rights reserved.</span>
      <div className='flex items-center gap-6'>
        <Link
          href='/login'
          className='transition-colors hover:text-text-secondary'
          style={{ color: 'var(--text-tertiary)' }}
        >
          로그인
        </Link>
        <Link
          href='/signup'
          className='transition-colors hover:text-text-secondary'
          style={{ color: 'var(--text-tertiary)' }}
        >
          회원가입
        </Link>
      </div>
    </footer>
  );
}
