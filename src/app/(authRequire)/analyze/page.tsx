'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Check, Globe, Search } from 'lucide-react';

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

type Phase = 'input' | 'analyzing' | 'done';

export default function AnalyzePage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('input');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [completedSteps, setCompletedSteps] = useState(0);
  const [activeStep, setActiveStep] = useState(0);
  const [apiDone, setApiDone] = useState(false);
  const reportIdRef = useRef<string | null>(null);
  const animDoneRef = useRef(false);

  const startAnalysis = useCallback(async () => {
    setError('');
    if (!url.trim()) {
      setError('웹사이트 주소를 입력해주세요.');
      return;
    }
    if (!isValidUrl(url.trim())) {
      setError('올바른 웹사이트 주소를 입력해주세요.');
      return;
    }

    setApiDone(false);
    animDoneRef.current = false;
    reportIdRef.current = null;
    setPhase('analyzing');
    setCompletedSteps(0);
    setActiveStep(0);

    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: normalizedUrl }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '분석에 실패했습니다.');
      }

      const data = await res.json();

      if (data.reportId) {
        // Claim immediately (user is already logged in)
        await fetch('/api/analyze/claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reportId: data.reportId }),
        });
        reportIdRef.current = data.reportId;
      }

      setApiDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '분석에 실패했습니다.');
      setPhase('input');
    }
  }, [url]);

  // Step animation — last step waits for API
  useEffect(() => {
    if (phase !== 'analyzing') return;
    const stepDurations = [800, 1200, 1000];
    let currentStep = 0;
    let cancelled = false;

    const runStep = () => {
      if (cancelled) return;
      if (currentStep >= ANALYSIS_STEPS.length - 1) {
        setActiveStep(currentStep);
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

  // When API finishes, complete last step and redirect to report
  useEffect(() => {
    if (!apiDone || phase !== 'analyzing') return;
    setCompletedSteps(ANALYSIS_STEPS.length);
    animDoneRef.current = true;
    setTimeout(() => {
      if (reportIdRef.current) {
        router.push(`/report/${reportIdRef.current}`);
      } else {
        setPhase('input');
        setError('리포트 생성에 실패했습니다.');
      }
    }, 600);
  }, [apiDone, phase, router]);

  return (
    <div className='flex-1 overflow-y-auto'>
      <div className='max-w-3xl mx-auto px-6 py-16'>
        {phase === 'input' && (
          <div className='text-center'>
            <h1
              className='text-2xl md:text-3xl font-bold mb-3'
              style={{ color: 'var(--text-primary)' }}
            >
              새 마케팅 전략 분석
            </h1>
            <p className='text-sm mb-10' style={{ color: 'var(--text-secondary)' }}>
              비즈니스 웹사이트를 분석하고 AI 맞춤 마케팅 전략을 받아보세요
            </p>

            <form
              onSubmit={(e) => { e.preventDefault(); startAnalysis(); }}
              className='max-w-2xl mx-auto'
            >
              <div
                className='flex items-center gap-2 p-2 rounded-2xl'
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border-default)',
                }}
              >
                <div className='flex items-center gap-2 flex-1 px-3'>
                  <Globe className='w-5 h-5 shrink-0' style={{ color: 'var(--text-tertiary)' }} />
                  <input
                    type='text'
                    placeholder='비즈니스 웹사이트 주소를 입력하세요'
                    value={url}
                    onChange={(e) => { setUrl(e.target.value); setError(''); }}
                    className='flex-1 bg-transparent outline-none text-base py-2'
                    style={{ color: 'var(--text-primary)' }}
                  />
                </div>
                <button
                  type='submit'
                  className='shrink-0 flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-90'
                  style={{
                    background: 'linear-gradient(135deg, #7C5CFC, #5B8DEF)',
                    color: '#fff',
                  }}
                >
                  <Search className='w-4 h-4' />
                  전략 분석받기
                </button>
              </div>
              {error && (
                <p className='text-sm mt-3' style={{ color: 'var(--error)' }}>{error}</p>
              )}
            </form>
          </div>
        )}

        {phase === 'analyzing' && (
          <div className='text-center'>
            <div
              className='w-16 h-16 mx-auto mb-8 rounded-2xl flex items-center justify-center'
              style={{ background: 'var(--accent-subtle)' }}
            >
              <Search className='w-7 h-7 animate-pulse' style={{ color: '#7C5CFC' }} />
            </div>
            <h2 className='text-2xl font-bold mb-2' style={{ color: 'var(--text-primary)' }}>
              분석 중입니다
            </h2>
            <p className='text-sm mb-10' style={{ color: 'var(--text-secondary)' }}>{url}</p>

            <div className='max-w-lg mx-auto flex flex-col gap-4 text-left'>
              {ANALYSIS_STEPS.map((step, i) => {
                const isCompleted = i < completedSteps;
                const isActive = i === activeStep && !isCompleted;
                return (
                  <div
                    key={step}
                    className='flex items-center gap-3 px-5 py-3.5 rounded-xl transition-all duration-300'
                    style={{
                      background: isActive ? 'rgba(124,92,252,0.08)' : isCompleted ? 'rgba(52,211,153,0.06)' : 'var(--surface-2)',
                      border: `1px solid ${isActive ? 'rgba(124,92,252,0.3)' : isCompleted ? 'rgba(52,211,153,0.2)' : 'var(--border-subtle)'}`,
                      opacity: !isActive && !isCompleted ? 0.5 : 1,
                    }}
                  >
                    {isCompleted ? (
                      <div className='w-6 h-6 rounded-full flex items-center justify-center shrink-0' style={{ background: 'rgba(52,211,153,0.15)' }}>
                        <Check className='w-3.5 h-3.5' style={{ color: 'var(--success)' }} />
                      </div>
                    ) : isActive ? (
                      <Loader2 className='w-5 h-5 animate-spin shrink-0' style={{ color: '#7C5CFC' }} />
                    ) : (
                      <div className='w-6 h-6 rounded-full shrink-0' style={{ background: 'var(--surface-3)' }} />
                    )}
                    <span className='text-sm font-medium' style={{
                      color: isCompleted ? 'var(--success)' : isActive ? 'var(--text-primary)' : 'var(--text-tertiary)',
                    }}>
                      {isCompleted ? step.replace('중...', ' 완료') : step}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
