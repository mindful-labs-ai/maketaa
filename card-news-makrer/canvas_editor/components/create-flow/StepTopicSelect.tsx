'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCw, Edit3 } from 'lucide-react';
import { useCreateStore } from '@/stores/useCreateStore';
import { suggestTopics } from '@/lib/ai-generate';
import type { TopicSuggestion } from '@/types';

// ============================================================================
// Component
// ============================================================================

export default function StepTopicSelect() {
  const {
    topicSuggestions,
    isLoadingSuggestions,
    selectTopic,
    setTopicSuggestions,
    setIsLoadingSuggestions,
    nextStep,
  } = useCreateStore();

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const isLoadingRef = React.useRef(false);
  const didMountRef = React.useRef(false);

  // Load suggestions on mount (guarded against React Strict Mode double-invoke)
  useEffect(() => {
    if (didMountRef.current) return;
    didMountRef.current = true;
    if (topicSuggestions.length === 0) {
      loadSuggestions();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadSuggestions = async () => {
    // Prevent concurrent requests
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    setIsLoadingSuggestions(true);
    setSelectedIndex(null);
    setShowCustomInput(false);

    try {
      const topics = await suggestTopics();
      setTopicSuggestions(topics);
    } catch (error) {
      console.error('Failed to load topics:', error);
    } finally {
      setIsLoadingSuggestions(false);
      isLoadingRef.current = false;
    }
  };

  const handleCardSelect = (idx: number) => {
    setSelectedIndex(idx);
    setShowCustomInput(false);
  };

  const handleCardConfirm = (suggestion: TopicSuggestion) => {
    selectTopic({
      source: 'ai-suggested',
      title: suggestion.title,
      description: suggestion.description,
      tags: suggestion.tags,
    });
    nextStep();
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim()) return;
    selectTopic({
      source: 'user-input',
      title: customTitle.trim(),
    });
    nextStep();
  };

  const displaySuggestions = topicSuggestions;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 pb-16">
        {/* Title */}
        <div className="mb-8">
          {/* Blue dot marker — LongBlack signature */}
          <div
            className="w-3 h-3 rounded-full mb-5"
            style={{ backgroundColor: '#4A7AFF' }}
          />
          <h1
            className="text-3xl font-bold leading-tight"
            style={{ color: '#FFFFFF', letterSpacing: '-0.02em' }}
          >
            어떤 주제로 만들까요?
          </h1>
          <p className="mt-2 text-base" style={{ color: 'rgba(255,255,255,0.5)' }}>
            AI가 추천한 주제를 선택하거나, 직접 입력하세요.
          </p>
        </div>

        {/* Loading skeleton */}
        {isLoadingSuggestions ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl animate-pulse"
                style={{
                  backgroundColor: '#333338',
                  height: 108,
                  opacity: 1 - i * 0.12,
                }}
              />
            ))}
          </div>
        ) : (
          <>
            {/* Topic cards */}
            <div className="flex flex-col gap-3">
              {displaySuggestions.map((suggestion, idx) => {
                const isSelected = selectedIndex === idx;

                return (
                  <button
                    key={idx}
                    onClick={() =>
                      isSelected
                        ? handleCardConfirm(suggestion)
                        : handleCardSelect(idx)
                    }
                    className="w-full text-left rounded-xl px-5 py-4 transition-all duration-200 group"
                    style={{
                      backgroundColor: isSelected ? '#1E2A4A' : '#333338',
                      border: `1.5px solid ${
                        isSelected
                          ? '#4A7AFF'
                          : 'rgba(255,255,255,0.06)'
                      }`,
                      transform: isSelected ? 'scale(1.01)' : 'scale(1)',
                      boxShadow: isSelected
                        ? '0 0 0 1px rgba(74,122,255,0.3), 0 8px 24px rgba(74,122,255,0.15)'
                        : '0 1px 3px rgba(0,0,0,0.3)',
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p
                          className="font-semibold text-base leading-snug mb-1.5"
                          style={{
                            color: isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.9)',
                          }}
                        >
                          {suggestion.title}
                        </p>
                        <p
                          className="text-sm leading-relaxed"
                          style={{ color: 'rgba(255,255,255,0.5)' }}
                        >
                          {suggestion.description}
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {suggestion.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-xs px-2 py-0.5 rounded-full"
                              style={{
                                backgroundColor: isSelected
                                  ? 'rgba(74,122,255,0.2)'
                                  : 'rgba(255,255,255,0.08)',
                                color: isSelected
                                  ? '#7AA4FF'
                                  : 'rgba(255,255,255,0.4)',
                              }}
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Selection indicator */}
                      {isSelected && (
                        <div
                          className="flex-none mt-0.5"
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
                          <svg
                            width="10"
                            height="8"
                            viewBox="0 0 10 8"
                            fill="none"
                          >
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

                    {/* Confirm hint when selected */}
                    {isSelected && (
                      <p
                        className="mt-3 text-xs font-medium"
                        style={{ color: '#4A7AFF' }}
                      >
                        탭하여 이 주제로 진행하기 →
                      </p>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Custom input section */}
            {showCustomInput && (
              <form
                onSubmit={handleCustomSubmit}
                className="mt-4 rounded-xl p-4"
                style={{
                  backgroundColor: '#333338',
                  border: '1.5px solid #4A7AFF',
                }}
              >
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: 'rgba(255,255,255,0.7)' }}
                >
                  직접 주제 입력
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="예: 직장인 우울증 자가진단법"
                  autoFocus
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
                <button
                  type="submit"
                  disabled={!customTitle.trim()}
                  className="mt-3 w-full py-2.5 rounded-lg text-sm font-semibold transition-all"
                  style={{
                    backgroundColor: customTitle.trim()
                      ? '#4A7AFF'
                      : 'rgba(74,122,255,0.3)',
                    color: customTitle.trim()
                      ? '#FFFFFF'
                      : 'rgba(255,255,255,0.4)',
                    cursor: customTitle.trim() ? 'pointer' : 'not-allowed',
                  }}
                >
                  이 주제로 시작하기
                </button>
              </form>
            )}

            {/* Bottom actions */}
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowCustomInput(true);
                  setSelectedIndex(null);
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.65)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.color = '#FFFFFF';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.65)';
                }}
              >
                <Edit3 size={14} />
                직접 입력하기
              </button>

              <button
                type="button"
                onClick={loadSuggestions}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.65)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.color = '#FFFFFF';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.65)';
                }}
              >
                <RefreshCw size={14} />
                다시 추천받기
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
