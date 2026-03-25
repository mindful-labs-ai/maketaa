import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import LandingHero from '@/components/landing/LandingHero';
import BottomURLInput from '@/components/landing/BottomURLInput';

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
      <LandingNav />
      <LandingHero />
      <FeatureCards />
      <HowItWorks />
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
      style={{ background: 'var(--surface-1)' }}
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
