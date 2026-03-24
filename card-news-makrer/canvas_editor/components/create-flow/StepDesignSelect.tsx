'use client';

import React from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { useCreateStore } from '@/stores/useCreateStore';
import { getAllDesignTemplates } from '@/lib/design-templates';
import type { DesignTemplate } from '@/types';

// ============================================================================
// Template mini-preview — dark card mimicking the LongBlack aesthetic
// ============================================================================

function TemplateMiniPreview({ template }: { template: DesignTemplate }) {
  const bg = template.config.background.type === 'solid'
    ? template.config.background.color
    : template.config.background.colors?.[0] ?? '#2A2A2E';

  const accent = template.config.accent_color;
  const textPrimary = template.config.text_colors.primary;
  const textMuted = template.config.text_colors.muted;

  return (
    <div
      className="w-full rounded-lg overflow-hidden relative"
      style={{
        backgroundColor: bg,
        aspectRatio: '1 / 1',
        padding: '12%',
      }}
    >
      {/* Blue dot marker */}
      <div
        className="absolute"
        style={{
          top: '10%',
          left: '10%',
          width: 6,
          height: 6,
          borderRadius: '50%',
          backgroundColor: accent,
        }}
      />

      {/* Mock headline lines */}
      <div className="absolute" style={{ top: '22%', left: '10%', right: '10%' }}>
        <div
          className="rounded-sm mb-1.5"
          style={{ height: 6, backgroundColor: textPrimary, width: '85%', opacity: 0.9 }}
        />
        <div
          className="rounded-sm mb-1.5"
          style={{ height: 6, backgroundColor: textPrimary, width: '65%', opacity: 0.9 }}
        />
        {/* Accent word */}
        <div
          className="rounded-sm"
          style={{ height: 6, backgroundColor: accent, width: '55%', opacity: 0.85 }}
        />
      </div>

      {/* Mock body lines */}
      <div className="absolute" style={{ top: '55%', left: '10%', right: '10%' }}>
        {[80, 90, 70].map((w, i) => (
          <div
            key={i}
            className="rounded-sm mb-1"
            style={{ height: 3, backgroundColor: textMuted, width: `${w}%` }}
          />
        ))}
      </div>

      {/* Brand area */}
      <div
        className="absolute text-center"
        style={{
          bottom: '6%',
          left: 0,
          right: 0,
          fontSize: 7,
          fontFamily: 'serif',
          color: textMuted,
          letterSpacing: '0.05em',
        }}
      >
        CardNews
      </div>
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export default function StepDesignSelect() {
  const {
    designTemplateId,
    setDesignTemplate,
    nextStep,
    prevStep,
  } = useCreateStore();

  const templates = getAllDesignTemplates();
  const canProceed = !!designTemplateId;

  const handleSelect = (id: string) => {
    setDesignTemplate(id);
  };

  const handleCreate = () => {
    if (!canProceed) return;
    nextStep();
  };

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
            디자인 컨셉을 선택하세요
          </h1>
          <p className="mt-2 text-base" style={{ color: 'rgba(255,255,255,0.5)' }}>
            선택한 템플릿이 카드뉴스 전체에 적용됩니다.
          </p>
        </div>

        {/* Template grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {templates.map((template) => {
            const isSelected = designTemplateId === template.id;

            return (
              <button
                key={template.id}
                onClick={() => handleSelect(template.id)}
                className="w-full text-left rounded-xl overflow-hidden transition-all duration-200 group"
                style={{
                  backgroundColor: '#333338',
                  border: `1.5px solid ${
                    isSelected ? '#4A7AFF' : 'rgba(255,255,255,0.07)'
                  }`,
                  transform: isSelected ? 'scale(1.01)' : 'scale(1)',
                  boxShadow: isSelected
                    ? '0 0 0 1px rgba(74,122,255,0.3), 0 8px 32px rgba(74,122,255,0.2)'
                    : '0 2px 8px rgba(0,0,0,0.4)',
                }}
              >
                {/* Preview area */}
                <div
                  className="relative"
                  style={{ padding: '12px 12px 0' }}
                >
                  <TemplateMiniPreview template={template} />

                  {/* Selected checkmark overlay */}
                  {isSelected && (
                    <div
                      className="absolute top-4 right-4 flex items-center justify-center rounded-full"
                      style={{
                        width: 24,
                        height: 24,
                        backgroundColor: '#4A7AFF',
                        boxShadow: '0 0 8px rgba(74,122,255,0.6)',
                      }}
                    >
                      <Check size={13} color="white" strokeWidth={2.5} />
                    </div>
                  )}
                </div>

                {/* Template info */}
                <div className="p-4">
                  <p
                    className="font-semibold text-sm mb-1"
                    style={{
                      color: isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.85)',
                    }}
                  >
                    {template.name}
                  </p>
                  <p
                    className="text-xs leading-relaxed"
                    style={{ color: 'rgba(255,255,255,0.4)' }}
                  >
                    {template.description}
                  </p>

                  {/* Feature tags */}
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {['다크모드', '블루 액센트', '좌측 정렬'].map((feat) => (
                      <span
                        key={feat}
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: isSelected
                            ? 'rgba(74,122,255,0.15)'
                            : 'rgba(255,255,255,0.06)',
                          color: isSelected
                            ? '#7AA4FF'
                            : 'rgba(255,255,255,0.35)',
                        }}
                      >
                        {feat}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            );
          })}

        </div>

        {/* Create button */}
        <div className="mt-8">
          <button
            onClick={handleCreate}
            disabled={!canProceed}
            className="w-full py-4 rounded-xl font-bold text-base transition-all duration-200"
            style={{
              backgroundColor: canProceed ? '#4A7AFF' : 'rgba(74,122,255,0.2)',
              color: canProceed ? '#FFFFFF' : 'rgba(255,255,255,0.3)',
              cursor: canProceed ? 'pointer' : 'not-allowed',
              boxShadow: canProceed
                ? '0 4px 20px rgba(74,122,255,0.4)'
                : 'none',
              transform: canProceed ? 'translateY(0)' : 'none',
              letterSpacing: '-0.01em',
            }}
            onMouseEnter={(e) => {
              if (canProceed) {
                e.currentTarget.style.backgroundColor = '#5B8BFF';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow =
                  '0 6px 24px rgba(74,122,255,0.5)';
              }
            }}
            onMouseLeave={(e) => {
              if (canProceed) {
                e.currentTarget.style.backgroundColor = '#4A7AFF';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow =
                  '0 4px 20px rgba(74,122,255,0.4)';
              }
            }}
          >
            {canProceed ? '카드뉴스 만들기' : '템플릿을 선택해주세요'}
          </button>

          {canProceed && (
            <p
              className="text-center text-xs mt-3"
              style={{ color: 'rgba(255,255,255,0.3)' }}
            >
              AI가 자동으로 카드뉴스를 생성합니다
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
