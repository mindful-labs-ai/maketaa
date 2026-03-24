'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { useCreateStore } from '@/stores/useCreateStore';
import StepTopicSelect from './StepTopicSelect';
import StepPurpose from './StepPurpose';
import StepDesignSelect from './StepDesignSelect';
import GeneratingScreen from './GeneratingScreen';
import type { CreateStep } from '@/types';

// ============================================================================
// Step indicator configuration
// ============================================================================

const STEPS: { key: CreateStep; label: string }[] = [
  { key: 'topic', label: '주제 선정' },
  { key: 'purpose', label: '목적 설정' },
  { key: 'design', label: '디자인 선택' },
];

const VISIBLE_STEPS: CreateStep[] = ['topic', 'purpose', 'design'];

// ============================================================================
// CreateWizard
// ============================================================================

export default function CreateWizard() {
  const router = useRouter();
  const currentStep = useCreateStore((s) => s.currentStep);
  const reset = useCreateStore((s) => s.reset);

  const currentVisibleIndex = VISIBLE_STEPS.indexOf(currentStep);
  const isGenerating = currentStep === 'generating';

  const handleClose = () => {
    reset();
    router.push('/');
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: '#1A1A1E' }}
    >
      {/* Step indicator — hidden during generation */}
      {!isGenerating && (
        <header className="flex-none pt-12 pb-8 px-6">
          <div className="max-w-2xl mx-auto">
            {/* Close button */}
            <div className="flex justify-end mb-4">
              <button
                onClick={handleClose}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{ color: 'rgba(255,255,255,0.4)', backgroundColor: 'rgba(255,255,255,0.06)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'rgba(255,255,255,0.8)';
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'rgba(255,255,255,0.4)';
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)';
                }}
              >
                <X size={14} />
                홈으로
              </button>
            </div>
            {/* Dots row */}
            <div className="flex items-center gap-0 mb-6">
              {STEPS.map((step, idx) => {
                const isCompleted = idx < currentVisibleIndex;
                const isActive = idx === currentVisibleIndex;

                return (
                  <React.Fragment key={step.key}>
                    {/* Step dot */}
                    <div className="flex flex-col items-center">
                      <div
                        className="transition-all duration-300"
                        style={{
                          width: isActive ? 12 : 8,
                          height: isActive ? 12 : 8,
                          borderRadius: '50%',
                          backgroundColor: isCompleted
                            ? '#4A7AFF'
                            : isActive
                            ? '#4A7AFF'
                            : 'rgba(255,255,255,0.2)',
                          boxShadow: isActive
                            ? '0 0 12px rgba(74,122,255,0.6)'
                            : 'none',
                        }}
                      />
                    </div>

                    {/* Connector line */}
                    {idx < STEPS.length - 1 && (
                      <div
                        className="flex-1 mx-2 h-px transition-all duration-500"
                        style={{
                          backgroundColor:
                            idx < currentVisibleIndex
                              ? '#4A7AFF'
                              : 'rgba(255,255,255,0.12)',
                        }}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Step labels row */}
            <div className="flex items-start">
              {STEPS.map((step, idx) => {
                const isCompleted = idx < currentVisibleIndex;
                const isActive = idx === currentVisibleIndex;

                return (
                  <React.Fragment key={step.key}>
                    <span
                      className="text-xs font-medium transition-all duration-300 whitespace-nowrap"
                      style={{
                        color: isActive
                          ? '#FFFFFF'
                          : isCompleted
                          ? 'rgba(255,255,255,0.5)'
                          : 'rgba(255,255,255,0.25)',
                        letterSpacing: '0.02em',
                      }}
                    >
                      {step.label}
                    </span>
                    {idx < STEPS.length - 1 && <div className="flex-1" />}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </header>
      )}

      {/* Step content */}
      <main className="flex-1 overflow-hidden">
        <StepContent step={currentStep} />
      </main>
    </div>
  );
}

// ============================================================================
// Step content switcher with fade transition
// ============================================================================

function StepContent({ step }: { step: CreateStep }) {
  const [displayStep, setDisplayStep] = React.useState<CreateStep>(step);
  const [opacity, setOpacity] = React.useState(1);

  // Fade out when step changes, then swap content
  React.useEffect(() => {
    if (step === displayStep) return;

    setOpacity(0);
    const timer = setTimeout(() => {
      setDisplayStep(step);
    }, 200);

    return () => clearTimeout(timer);
  }, [step, displayStep]);

  // Fade in when displayStep updates to match step
  React.useEffect(() => {
    if (displayStep === step && opacity === 0) {
      // Use rAF to ensure the DOM has rendered with opacity 0 before fading in
      const raf = requestAnimationFrame(() => setOpacity(1));
      return () => cancelAnimationFrame(raf);
    }
  }, [displayStep, step, opacity]);

  return (
    <div
      className="h-full transition-opacity duration-200"
      style={{ opacity }}
    >
      {displayStep === 'topic' && <StepTopicSelect />}
      {displayStep === 'purpose' && <StepPurpose />}
      {displayStep === 'design' && <StepDesignSelect />}
      {displayStep === 'generating' && <GeneratingScreen />}
    </div>
  );
}
