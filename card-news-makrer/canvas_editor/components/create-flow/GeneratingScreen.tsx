'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useCreateStore } from '@/stores/useCreateStore';
import { generateCardNews } from '@/lib/ai-generate';
import { createCardSpec } from '@/lib/api';

// ============================================================================
// Progress message sequence
// ============================================================================

const PROGRESS_MESSAGES = [
  '주제를 분석하고 있어요...',
  '카드 구성을 설계하고 있어요...',
  'AI가 콘텐츠를 작성하고 있어요...',
  '문장을 다듬고 있어요...',
  '디자인을 적용하고 있어요...',
  '거의 완성됐어요...',
];

const MESSAGE_INTERVAL = 2500; // ms per message (longer for AI generation)
const TOTAL_DURATION = 15000;  // 15s — matches typical Gemini response time

// ============================================================================
// Animated blue dot — LongBlack signature pulsing marker
// ============================================================================

function PulsingDot() {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 64, height: 64 }}>
      {/* Outer pulse ring */}
      <div
        className="absolute rounded-full animate-ping"
        style={{
          width: 64,
          height: 64,
          backgroundColor: 'rgba(74,122,255,0.15)',
          animationDuration: '1.5s',
        }}
      />
      {/* Middle ring */}
      <div
        className="absolute rounded-full animate-ping"
        style={{
          width: 44,
          height: 44,
          backgroundColor: 'rgba(74,122,255,0.2)',
          animationDuration: '1.5s',
          animationDelay: '0.2s',
        }}
      />
      {/* Core dot */}
      <div
        className="relative rounded-full"
        style={{
          width: 20,
          height: 20,
          backgroundColor: '#4A7AFF',
          boxShadow: '0 0 20px rgba(74,122,255,0.8)',
        }}
      />
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export default function GeneratingScreen() {
  const router = useRouter();
  const {
    isGenerating,
    generationError,
    generationProgress,
    setIsGenerating,
    setGenerationProgress,
    setGenerationError,
    reset,
  } = useCreateStore();

  const [messageIndex, setMessageIndex] = useState(0);
  const [displayedMessage, setDisplayedMessage] = useState(PROGRESS_MESSAGES[0]);
  const [messageOpacity, setMessageOpacity] = useState(1);
  const [progressPercent, setProgressPercent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const didStartRef = useRef(false);

  // Start generation on mount (guarded against React Strict Mode double-invoke)
  useEffect(() => {
    if (didStartRef.current) return;
    didStartRef.current = true;
    mountedRef.current = true;
    startGeneration();
    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const cleanup = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
  };

  const startGeneration = () => {
    setIsGenerating(true);
    setGenerationError(null);
    setMessageIndex(0);
    setDisplayedMessage(PROGRESS_MESSAGES[0]);
    setGenerationProgress(PROGRESS_MESSAGES[0]);
    setProgressPercent(0);

    // Cycle through progress messages with fade transitions
    let currentIdx = 0;
    intervalRef.current = setInterval(() => {
      currentIdx += 1;
      if (currentIdx >= PROGRESS_MESSAGES.length) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        return;
      }

      // Fade out → update → fade in
      setMessageOpacity(0);
      fadeTimerRef.current = setTimeout(() => {
        if (!mountedRef.current) return;
        setMessageIndex(currentIdx);
        setDisplayedMessage(PROGRESS_MESSAGES[currentIdx]);
        setGenerationProgress(PROGRESS_MESSAGES[currentIdx]);
        setMessageOpacity(1);
      }, 200);
    }, MESSAGE_INTERVAL);

    // Smooth progress bar (animate up to 90% while waiting for API)
    const startTime = Date.now();
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(90, (elapsed / TOTAL_DURATION) * 90);
      setProgressPercent(pct);
    }, 50);

    // Real AI generation
    const { topic, purpose, designTemplateId } = useCreateStore.getState();

    if (!topic || !purpose || !designTemplateId) {
      cleanup();
      setGenerationError('필요한 정보가 없습니다. 처음부터 다시 시도해주세요.');
      setIsGenerating(false);
      return;
    }

    console.log('[GeneratingScreen] Starting generateCardNews API call...', { topic: topic.title, purpose: purpose.type, templateId: designTemplateId });
    const apiStartTime = Date.now();

    generateCardNews({ topic, purpose, templateId: designTemplateId })
      .then(async (result) => {
        console.log(`[GeneratingScreen] API success in ${((Date.now() - apiStartTime) / 1000).toFixed(1)}s, cards: ${result.spec.cards.length}`);
        // Stop progress animations but keep mounted
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

        setProgressPercent(95);
        setDisplayedMessage('카드뉴스를 저장하고 있어요...');

        try {
          console.log('[GeneratingScreen] Saving to Supabase...', result.id);
          await createCardSpec(result.spec);
          console.log('[GeneratingScreen] Saved. Redirecting to editor...');
        } catch (saveError) {
          console.error('[GeneratingScreen] Supabase save failed:', saveError);
          // Continue to redirect even if save fails — spec is in memory
        }

        setProgressPercent(100);

        // Redirect to editor (no mountedRef guard — must navigate even if unmounting)
        console.log('[GeneratingScreen] Redirecting in 400ms to', `/editor/${result.id}`);
        redirectTimerRef.current = setTimeout(() => {
          setIsGenerating(false);
          router.push(`/editor/${result.id}`);
        }, 400);
      })
      .catch((error) => {
        console.error(`[GeneratingScreen] API error after ${((Date.now() - apiStartTime) / 1000).toFixed(1)}s:`, error);
        cleanup();
        setGenerationError(
          error instanceof Error ? error.message : '생성에 실패했습니다'
        );
        setIsGenerating(false);
      });
  };

  const handleRetry = () => {
    cleanup();
    setGenerationError(null);
    startGeneration();
  };

  const handleCancel = () => {
    cleanup();
    reset();
    router.push('/');
  };

  // ============================================================================
  // Error state
  // ============================================================================

  if (generationError) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-6"
        style={{ backgroundColor: '#1A1A1E' }}
      >
        <div className="max-w-sm w-full text-center">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-6"
            style={{ backgroundColor: 'rgba(255,80,80,0.12)' }}
          >
            <AlertCircle size={28} style={{ color: '#FF5050' }} />
          </div>

          <h2
            className="text-xl font-bold mb-2"
            style={{ color: '#FFFFFF' }}
          >
            생성에 실패했어요
          </h2>
          <p
            className="text-sm mb-8 leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.5)' }}
          >
            {generationError}
          </p>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleRetry}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm transition-all"
              style={{ backgroundColor: '#4A7AFF', color: '#FFFFFF' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#5B8BFF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#4A7AFF';
              }}
            >
              <RefreshCw size={15} />
              다시 시도하기
            </button>

            <button
              onClick={handleCancel}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all"
              style={{
                backgroundColor: 'rgba(255,255,255,0.06)',
                color: 'rgba(255,255,255,0.55)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                e.currentTarget.style.color = 'rgba(255,255,255,0.8)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)';
                e.currentTarget.style.color = 'rgba(255,255,255,0.55)';
              }}
            >
              처음으로 돌아가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // Generating state
  // ============================================================================

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ backgroundColor: '#1A1A1E' }}
    >
      <div className="max-w-sm w-full text-center">
        {/* Pulsing dot */}
        <div className="flex justify-center mb-10">
          <PulsingDot />
        </div>

        {/* Progress message */}
        <p
          className="text-lg font-semibold mb-2 transition-opacity duration-200"
          style={{
            color: '#FFFFFF',
            opacity: messageOpacity,
            letterSpacing: '-0.01em',
          }}
        >
          {displayedMessage}
        </p>

        {/* Step indicator */}
        <p
          className="text-sm mb-10"
          style={{ color: 'rgba(255,255,255,0.35)' }}
        >
          {messageIndex + 1} / {PROGRESS_MESSAGES.length}
        </p>

        {/* Progress bar */}
        <div
          className="w-full rounded-full overflow-hidden"
          style={{
            height: 3,
            backgroundColor: 'rgba(255,255,255,0.08)',
          }}
        >
          <div
            className="h-full rounded-full transition-all duration-100"
            style={{
              width: `${progressPercent}%`,
              backgroundColor: '#4A7AFF',
              boxShadow: '0 0 8px rgba(74,122,255,0.6)',
            }}
          />
        </div>

        {/* Dot step indicators */}
        <div className="flex justify-center gap-2 mt-6">
          {PROGRESS_MESSAGES.map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === messageIndex ? 20 : 6,
                height: 6,
                backgroundColor:
                  i <= messageIndex
                    ? '#4A7AFF'
                    : 'rgba(255,255,255,0.15)',
              }}
            />
          ))}
        </div>

        {/* Cancel */}
        <button
          onClick={handleCancel}
          className="mt-12 text-xs transition-all"
          style={{ color: 'rgba(255,255,255,0.25)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'rgba(255,255,255,0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'rgba(255,255,255,0.25)';
          }}
        >
          취소하고 처음으로
        </button>
      </div>
    </div>
  );
}
