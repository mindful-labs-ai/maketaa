'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Loader2, Check, ArrowRight, Globe, Search } from 'lucide-react';
import ParticleBackground from './ParticleBackground';
import { creditFetch } from '@/lib/credits/creditFetch';

type HeroPhase = 'input' | 'analyzing' | 'report';

interface AnalysisReport {
  businessName: string;
  businessType: string;
  summary: string;
  contentStrategy: string[];
  recommendedActions: { tool: string; action: string }[];
  reportId: string | null;
}

const ANALYSIS_STEPS = [
  '웹사이트 크롤링 중...',
  '비즈니스 유형 분석 중...',
  '타겟 고객 파악 중...',
  '맞춤 콘텐츠 전략 생성 중...',
];

function isValidUrl(str: string): boolean {
  try {
    const url = str.startsWith('http') ? str : `https://${str}`;
    new URL(url);
    return str.includes('.');
  } catch {
    return false;
  }
}

export default function LandingHero() {
  const [phase, setPhase] = useState<HeroPhase>('input');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [completedSteps, setCompletedSteps] = useState<number>(0);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [apiDone, setApiDone] = useState(false);

  // Refs for coordinating animation with API fetch
  const animDoneRef = useRef(false);
  const reportRef = useRef<AnalysisReport | null>(null);

  const tryShowReport = useCallback(() => {
    if (reportRef.current && animDoneRef.current) {
      setReport(reportRef.current);
      setPhase('report');
    }
  }, []);

  // Start analysis — called directly with a URL string (no form dependency)
  const startAnalysis = useCallback(
    async (inputUrl: string) => {
      setError('');

      if (!inputUrl.trim()) {
        setError('웹사이트 주소를 입력해주세요.');
        return;
      }
      if (!isValidUrl(inputUrl.trim())) {
        setError('올바른 웹사이트 주소를 입력해주세요.');
        return;
      }

      // Reset coordination state
      setApiDone(false);
      animDoneRef.current = false;
      reportRef.current = null;

      setPhase('analyzing');
      setCompletedSteps(0);
      setActiveStep(0);

      const normalizedUrl = inputUrl.startsWith('http') ? inputUrl : `https://${inputUrl}`;

      try {
        const res = await creditFetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: normalizedUrl }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || '분석에 실패했습니다. 다시 시도해주세요.');
        }

        const data: AnalysisReport = await res.json();

        console.log('[LandingHero] API response:', JSON.stringify({ reportId: data.reportId, businessName: data.businessName }));

        // Store for post-signup linking (localStorage for email login, cookie for OAuth)
        if (data.reportId) {
          localStorage.setItem('pending_report_id', data.reportId);
          document.cookie = `pending_report_id=${data.reportId};path=/;max-age=86400;samesite=lax`;
          console.log('[LandingHero] Stored reportId:', data.reportId);
        } else {
          console.warn('[LandingHero] No reportId in API response — DB save likely failed');
        }
        localStorage.setItem('pending_report', JSON.stringify(data));
        localStorage.setItem('analyzed_url', normalizedUrl);

        reportRef.current = data;
        setApiDone(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : '분석에 실패했습니다.');
        setPhase('input');
      }
    },
    [tryShowReport],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      startAnalysis(url);
    },
    [url, startAnalysis],
  );

  // Listen for URL submissions from BottomURLInput (no race condition — uses ref)
  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) {
        setUrl(customEvent.detail);
        startAnalysis(customEvent.detail);
      }
    };
    window.addEventListener('landing-url-submit', handler);
    return () => window.removeEventListener('landing-url-submit', handler);
  }, [startAnalysis]);

  // Sequential step animation — steps 1-3 animate on fixed timers,
  // step 4 (last) stays spinning until the API actually returns.
  useEffect(() => {
    if (phase !== 'analyzing') return;

    const stepDurations = [800, 1200, 1000]; // only first 3 steps have fixed durations
    let currentStep = 0;
    let cancelled = false;

    const runStep = () => {
      if (cancelled) return;

      if (currentStep >= ANALYSIS_STEPS.length - 1) {
        // Last step — just show it as active, don't auto-complete
        setActiveStep(currentStep);
        // It stays spinning; tryShowReport will be called when API finishes
        return;
      }

      setActiveStep(currentStep);

      setTimeout(() => {
        if (cancelled) return;
        currentStep++;
        setCompletedSteps(currentStep);
        runStep();
      }, stepDurations[currentStep]);
    };

    runStep();
    return () => { cancelled = true; };
  }, [phase]);

  // When API finishes, complete the last step and transition to report
  useEffect(() => {
    if (!apiDone || phase !== 'analyzing') return;
    // Mark all steps complete including the last one
    setCompletedSteps(ANALYSIS_STEPS.length);
    animDoneRef.current = true;
    setTimeout(() => tryShowReport(), 600);
  }, [apiDone, phase, tryShowReport]);

  // --- INPUT PHASE ---
  if (phase === 'input') {
    return (
      <section className='relative flex flex-col items-center justify-center text-center px-6 py-28 md:py-40 overflow-hidden'>
        {/* Interactive particle background */}
        <ParticleBackground />
        {/* Background glow */}
        <div
          className='pointer-events-none absolute inset-0'
          style={{
            background:
              'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(124,92,252,0.12) 0%, transparent 70%)',
            zIndex: 1,
          }}
        />

        <div className='relative z-10 max-w-3xl mx-auto'>
          <div
            className='inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-8'
            style={{
              background: 'var(--accent-subtle)',
              border: '1px solid rgba(124,92,252,0.3)',
              color: '#A78BFA',
            }}
          >
            <span
              className='inline-block w-1.5 h-1.5 rounded-full'
              style={{ background: '#7C5CFC' }}
            />
            AI 마케팅 전략 분석
          </div>

          <h1
            className='text-4xl md:text-6xl font-bold leading-tight tracking-tight mb-6'
            style={{ color: 'var(--text-primary)' }}
          >
            당신의 비즈니스에 딱 맞는
            <br />
            AI 마케팅 전략,{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #7C5CFC 0%, #5B8DEF 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              마케타
            </span>
          </h1>

          <p
            className='text-lg md:text-xl mb-10 max-w-xl mx-auto'
            style={{ color: 'var(--text-secondary)', lineHeight: '1.7' }}
          >
            웹사이트 주소만 입력하면, AI가 비즈니스를 분석하고
            <br />
            숏폼·카드뉴스·SNS 콘텐츠 전략을 자동으로 설계합니다.
          </p>

          {/* URL Input Form */}
          <form id='hero-url-form' onSubmit={handleSubmit} className='max-w-2xl mx-auto'>
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
                  onChange={(e) => {
                    setUrl(e.target.value);
                    setError('');
                  }}
                  className='flex-1 bg-transparent outline-none text-base py-2'
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
                마케팅 콘텐츠 전략 분석받기
              </button>
            </div>

            {error && (
              <p className='text-sm mt-3' style={{ color: 'var(--error)' }}>
                {error}
              </p>
            )}
          </form>

          {/* Trust badges */}
          <div
            className='flex items-center justify-center gap-4 mt-6 text-sm'
            style={{ color: 'var(--text-tertiary)' }}
          >
            <span>무료</span>
            <span style={{ color: 'var(--border-strong)' }}>·</span>
            <span>30초 분석</span>
            <span style={{ color: 'var(--border-strong)' }}>·</span>
            <span>가입 없이 시작</span>
          </div>
        </div>
      </section>
    );
  }

  // --- ANALYZING PHASE ---
  if (phase === 'analyzing') {
    return (
      <section className='relative flex flex-col items-center justify-center text-center px-6 py-28 md:py-40 overflow-hidden'>
        <ParticleBackground />
        <div
          className='pointer-events-none absolute inset-0'
          style={{
            background:
              'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(124,92,252,0.18) 0%, transparent 70%)',
            zIndex: 1,
          }}
        />

        <div className='relative z-10 max-w-lg mx-auto'>
          <div
            className='w-16 h-16 mx-auto mb-8 rounded-2xl flex items-center justify-center'
            style={{ background: 'var(--accent-subtle)' }}
          >
            <Search className='w-7 h-7 animate-pulse' style={{ color: '#7C5CFC' }} />
          </div>

          <h2
            className='text-2xl md:text-3xl font-bold mb-2'
            style={{ color: 'var(--text-primary)' }}
          >
            분석 중입니다
          </h2>
          <p className='text-sm mb-10' style={{ color: 'var(--text-secondary)' }}>
            {url}
          </p>

          <div className='flex flex-col gap-4 text-left'>
            {ANALYSIS_STEPS.map((step, i) => {
              const isCompleted = i < completedSteps;
              const isActive = i === activeStep && !isCompleted;

              return (
                <div
                  key={step}
                  className='flex items-center gap-3 px-5 py-3.5 rounded-xl transition-all duration-300'
                  style={{
                    background: isActive
                      ? 'rgba(124,92,252,0.08)'
                      : isCompleted
                        ? 'rgba(52,211,153,0.06)'
                        : 'var(--surface-1)',
                    border: `1px solid ${isActive ? 'rgba(124,92,252,0.3)' : isCompleted ? 'rgba(52,211,153,0.2)' : 'var(--border-subtle)'}`,
                    opacity: !isActive && !isCompleted ? 0.5 : 1,
                  }}
                >
                  {isCompleted ? (
                    <div
                      className='w-6 h-6 rounded-full flex items-center justify-center shrink-0'
                      style={{ background: 'rgba(52,211,153,0.15)' }}
                    >
                      <Check className='w-3.5 h-3.5' style={{ color: 'var(--success)' }} />
                    </div>
                  ) : isActive ? (
                    <Loader2
                      className='w-5 h-5 animate-spin shrink-0'
                      style={{ color: '#7C5CFC' }}
                    />
                  ) : (
                    <div
                      className='w-6 h-6 rounded-full shrink-0'
                      style={{ background: 'var(--surface-2)' }}
                    />
                  )}
                  <span
                    className='text-sm font-medium'
                    style={{
                      color: isCompleted
                        ? 'var(--success)'
                        : isActive
                          ? 'var(--text-primary)'
                          : 'var(--text-tertiary)',
                    }}
                  >
                    {isCompleted ? step.replace('중...', ' 완료') : step}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  // --- REPORT PHASE ---
  return (
    <section className='relative flex flex-col items-center justify-center text-center px-6 py-20 md:py-32 overflow-hidden'>
      <ParticleBackground />
      <div
        className='pointer-events-none absolute inset-0'
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(52,211,153,0.08) 0%, transparent 70%)',
          zIndex: 1,
        }}
      />

      <div className='relative z-10 max-w-2xl mx-auto w-full'>
        {/* Success badge */}
        <div
          className='inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-6'
          style={{
            background: 'rgba(52,211,153,0.1)',
            border: '1px solid rgba(52,211,153,0.3)',
            color: 'var(--success)',
          }}
        >
          <Check className='w-3.5 h-3.5' />
          분석 완료
        </div>

        <h2
          className='text-2xl md:text-3xl font-bold mb-2'
          style={{ color: 'var(--text-primary)' }}
        >
          {report?.businessName || url}의 마케팅 전략 리포트
        </h2>
        <p className='text-sm mb-8' style={{ color: 'var(--text-secondary)' }}>
          AI가 비즈니스에 최적화된 콘텐츠 전략을 설계했습니다
        </p>

        {/* Report card */}
        <div
          className='rounded-2xl overflow-hidden text-left'
          style={{
            background: 'var(--surface-1)',
            border: '1px solid var(--border-default)',
          }}
        >
          {/* Visible part */}
          <div className='p-6 flex flex-col gap-4'>
            <div className='flex items-start gap-4'>
              <div
                className='w-10 h-10 rounded-xl flex items-center justify-center shrink-0'
                style={{ background: 'var(--accent-subtle)' }}
              >
                <Globe className='w-5 h-5' style={{ color: '#7C5CFC' }} />
              </div>
              <div className='flex-1 min-w-0'>
                <div className='flex items-center gap-2 mb-1'>
                  <span
                    className='text-sm font-semibold'
                    style={{ color: 'var(--text-primary)' }}
                  >
                    비즈니스 유형
                  </span>
                  <span
                    className='text-xs px-2 py-0.5 rounded-full'
                    style={{
                      background: 'rgba(124,92,252,0.12)',
                      color: '#A78BFA',
                    }}
                  >
                    {report?.businessType || '분석됨'}
                  </span>
                </div>
                <p className='text-sm' style={{ color: 'var(--text-secondary)' }}>
                  {report?.summary || '비즈니스 분석이 완료되었습니다.'}
                </p>
              </div>
            </div>

            {/* First recommendation visible */}
            {report?.contentStrategy?.[0] && (
              <div
                className='px-4 py-3 rounded-xl text-sm'
                style={{
                  background: 'var(--surface-2)',
                  color: 'var(--text-secondary)',
                  borderLeft: '3px solid #7C5CFC',
                }}
              >
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                  추천 콘텐츠 유형:{' '}
                </span>
                {report.contentStrategy[0]}
              </div>
            )}
          </div>

          {/* Blurred part */}
          <div className='relative'>
            <div
              className='p-6 flex flex-col gap-3'
              style={{ filter: 'blur(6px)', userSelect: 'none' }}
              aria-hidden='true'
            >
              <div
                className='h-4 rounded-full'
                style={{ background: 'var(--surface-2)', width: '85%' }}
              />
              <div
                className='h-4 rounded-full'
                style={{ background: 'var(--surface-2)', width: '70%' }}
              />
              <div
                className='h-4 rounded-full'
                style={{ background: 'var(--surface-2)', width: '90%' }}
              />
              <div className='mt-2 grid grid-cols-2 gap-3'>
                <div
                  className='h-20 rounded-xl'
                  style={{ background: 'var(--surface-2)' }}
                />
                <div
                  className='h-20 rounded-xl'
                  style={{ background: 'var(--surface-2)' }}
                />
              </div>
              <div
                className='h-4 rounded-full'
                style={{ background: 'var(--surface-2)', width: '60%' }}
              />
              <div
                className='h-4 rounded-full'
                style={{ background: 'var(--surface-2)', width: '75%' }}
              />
            </div>

            {/* Overlay CTA */}
            <div className='absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-t from-[var(--surface-1)] via-[var(--surface-1)]/80 to-transparent'>
              <p
                className='text-sm font-medium text-center px-4'
                style={{ color: 'var(--text-secondary)' }}
              >
                전체 리포트를 확인하고
                <br />
                AI가 추천한 콘텐츠를 바로 만들어보세요
              </p>
              <Link
                href='/signup'
                className='inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.99]'
                style={{
                  background: 'linear-gradient(135deg, #7C5CFC 0%, #5B8DEF 100%)',
                  color: '#fff',
                  boxShadow: '0 8px 32px rgba(124,92,252,0.35)',
                }}
              >
                무료 가입하고 리포트 보기
                <ArrowRight className='w-4 h-4' />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
