'use client';

import React, { useState } from 'react';
import { ArrowLeft, BookOpen, Target, Sparkles, Link } from 'lucide-react';
import { useCreateStore } from '@/stores/useCreateStore';
import type { ContentPurpose, PurposeConfig } from '@/types';

// ============================================================================
// Purpose option definitions
// ============================================================================

interface PurposeOption {
  type: ContentPurpose;
  icon: React.ReactNode;
  label: string;
  sublabel: string;
}

const PURPOSE_OPTIONS: PurposeOption[] = [
  {
    type: 'informational',
    icon: <BookOpen size={22} />,
    label: '정보 전달',
    sublabel: '지식과 팁을 공유해요',
  },
  {
    type: 'action-driven',
    icon: <Target size={22} />,
    label: '행동 유도',
    sublabel: '특정 행동을 이끌어내요',
  },
  {
    type: 'auto',
    icon: <Sparkles size={22} />,
    label: '알아서 만들어 주세요',
    sublabel: 'AI가 최적의 구성을 결정해요',
  },
];

// ============================================================================
// Component
// ============================================================================

export default function StepPurpose() {
  const { topic, setPurpose, nextStep, prevStep } = useCreateStore();

  const [selectedType, setSelectedType] = useState<ContentPurpose | null>(null);
  const [ctaText, setCtaText] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');

  const handleSelect = (type: ContentPurpose) => {
    if (type !== 'action-driven') {
      // Non-CTA types: confirm immediately on second tap
      if (selectedType === type) {
        handleConfirm(type);
        return;
      }
    }
    setSelectedType(type);
  };

  const handleConfirm = (type: ContentPurpose) => {
    const config: PurposeConfig = {
      type,
      ...(type === 'action-driven' && ctaText.trim()
        ? {
            cta: {
              type: 'custom',
              text: ctaText.trim(),
              url: ctaUrl.trim() || undefined,
            },
          }
        : {}),
    };
    setPurpose(config);
    nextStep();
  };

  const canProceedCta = selectedType === 'action-driven' && ctaText.trim().length > 0;
  const canProceedOther =
    selectedType !== null && selectedType !== 'action-driven';

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 pb-16">
        {/* Back button */}
        <button
          onClick={prevStep}
          className="flex items-center gap-1.5 mb-8 transition-all"
          style={{ color: 'rgba(255,255,255,0.4)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'rgba(255,255,255,0.8)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'rgba(255,255,255,0.4)';
          }}
        >
          <ArrowLeft size={16} />
          <span className="text-sm">이전</span>
        </button>

        {/* Selected topic pill */}
        {topic && (
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6"
            style={{
              backgroundColor: 'rgba(74,122,255,0.12)',
              border: '1px solid rgba(74,122,255,0.25)',
            }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full flex-none"
              style={{ backgroundColor: '#4A7AFF' }}
            />
            <span
              className="text-sm font-medium truncate max-w-xs"
              style={{ color: '#7AA4FF' }}
            >
              {topic.title}
            </span>
          </div>
        )}

        {/* Title */}
        <div className="mb-8">
          <div
            className="w-3 h-3 rounded-full mb-5"
            style={{ backgroundColor: '#4A7AFF' }}
          />
          <h1
            className="text-3xl font-bold leading-tight"
            style={{ color: '#FFFFFF', letterSpacing: '-0.02em' }}
          >
            이 카드뉴스의 목적은?
          </h1>
          <p className="mt-2 text-base" style={{ color: 'rgba(255,255,255,0.5)' }}>
            목적에 맞게 콘텐츠 구성을 최적화합니다.
          </p>
        </div>

        {/* Purpose option cards */}
        <div className="flex flex-col gap-3">
          {PURPOSE_OPTIONS.map((option) => {
            const isSelected = selectedType === option.type;

            return (
              <button
                key={option.type}
                onClick={() => handleSelect(option.type)}
                className="w-full text-left rounded-xl px-5 py-4 transition-all duration-200"
                style={{
                  backgroundColor: isSelected ? '#1E2A4A' : '#333338',
                  border: `1.5px solid ${
                    isSelected ? '#4A7AFF' : 'rgba(255,255,255,0.06)'
                  }`,
                  transform: isSelected ? 'scale(1.01)' : 'scale(1)',
                  boxShadow: isSelected
                    ? '0 0 0 1px rgba(74,122,255,0.3), 0 8px 24px rgba(74,122,255,0.15)'
                    : '0 1px 3px rgba(0,0,0,0.3)',
                }}
              >
                <div className="flex items-center gap-4">
                  {/* Icon circle */}
                  <div
                    className="flex-none flex items-center justify-center rounded-xl"
                    style={{
                      width: 48,
                      height: 48,
                      backgroundColor: isSelected
                        ? 'rgba(74,122,255,0.2)'
                        : 'rgba(255,255,255,0.07)',
                      color: isSelected ? '#4A7AFF' : 'rgba(255,255,255,0.5)',
                      transition: 'all 0.2s',
                    }}
                  >
                    {option.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p
                      className="font-semibold text-base leading-snug"
                      style={{
                        color: isSelected
                          ? '#FFFFFF'
                          : 'rgba(255,255,255,0.9)',
                      }}
                    >
                      {option.label}
                    </p>
                    <p
                      className="text-sm mt-0.5"
                      style={{ color: 'rgba(255,255,255,0.45)' }}
                    >
                      {option.sublabel}
                    </p>
                  </div>

                  {/* Check */}
                  {isSelected && (
                    <div
                      className="flex-none"
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        backgroundColor: '#4A7AFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path
                          d="M1 4L3.8 7L9 1"
                          stroke="white"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Confirm hint for non-CTA options */}
                {isSelected && option.type !== 'action-driven' && (
                  <p
                    className="mt-3 text-xs font-medium"
                    style={{ color: '#4A7AFF' }}
                  >
                    탭하여 이 목적으로 진행하기 →
                  </p>
                )}
              </button>
            );
          })}
        </div>

        {/* CTA input — shown when action-driven is selected */}
        {selectedType === 'action-driven' && (
          <div
            className="mt-4 rounded-xl p-5 transition-all duration-300"
            style={{
              backgroundColor: '#252530',
              border: '1.5px solid rgba(74,122,255,0.3)',
            }}
          >
            <p
              className="text-sm font-semibold mb-4"
              style={{ color: 'rgba(255,255,255,0.7)' }}
            >
              CTA 설정
            </p>

            {/* CTA text */}
            <div className="mb-3">
              <label
                className="block text-xs mb-1.5"
                style={{ color: 'rgba(255,255,255,0.45)' }}
              >
                행동 유도 문구 <span style={{ color: '#4A7AFF' }}>*</span>
              </label>
              <input
                type="text"
                value={ctaText}
                onChange={(e) => setCtaText(e.target.value)}
                placeholder="예: 지금 바로 상담 신청하기"
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#FFFFFF',
                  caretColor: '#4A7AFF',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#4A7AFF';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
                }}
              />
            </div>

            {/* CTA URL (optional) */}
            <div>
              <label
                className="block text-xs mb-1.5"
                style={{ color: 'rgba(255,255,255,0.45)' }}
              >
                링크 URL <span style={{ color: 'rgba(255,255,255,0.3)' }}>(선택)</span>
              </label>
              <div className="relative">
                <Link
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: 'rgba(255,255,255,0.3)' }}
                />
                <input
                  type="url"
                  value={ctaUrl}
                  onChange={(e) => setCtaUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg text-sm outline-none transition-all"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: '#FFFFFF',
                    caretColor: '#4A7AFF',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#4A7AFF';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
                  }}
                />
              </div>
            </div>

            {/* Proceed button for action-driven */}
            <button
              onClick={() => handleConfirm('action-driven')}
              disabled={!canProceedCta}
              className="mt-4 w-full py-3 rounded-lg text-sm font-semibold transition-all"
              style={{
                backgroundColor: canProceedCta
                  ? '#4A7AFF'
                  : 'rgba(74,122,255,0.25)',
                color: canProceedCta
                  ? '#FFFFFF'
                  : 'rgba(255,255,255,0.35)',
                cursor: canProceedCta ? 'pointer' : 'not-allowed',
              }}
            >
              다음 단계로
            </button>
          </div>
        )}

        {/* Proceed button for other selections */}
        {canProceedOther && (
          <button
            onClick={() => handleConfirm(selectedType!)}
            className="mt-6 w-full py-3.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              backgroundColor: '#4A7AFF',
              color: '#FFFFFF',
            }}
          >
            다음 단계로
          </button>
        )}
      </div>
    </div>
  );
}
