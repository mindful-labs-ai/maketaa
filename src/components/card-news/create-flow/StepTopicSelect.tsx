'use client';

import { useEffect, useState } from 'react';
import { useCreateStore } from '@/stores/card-news/useCreateStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { TopicSelection } from '@/lib/card-news/types';

export default function StepTopicSelect() {
  const {
    topicSuggestions,
    isLoadingSuggestions,
    topic,
    setTopicSuggestions,
    setIsLoadingSuggestions,
    selectTopic,
    nextStep,
  } = useCreateStore();

  const [customTitle, setCustomTitle] = useState('');

  useEffect(() => {
    if (topicSuggestions.length > 0) return;

    async function fetchSuggestions() {
      setIsLoadingSuggestions(true);
      try {
        const res = await fetch('/api/card-news/suggest-topics', { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          setTopicSuggestions(data.topics || []);
        }
      } catch {
        // silently fail
      } finally {
        setIsLoadingSuggestions(false);
      }
    }
    fetchSuggestions();
  }, [topicSuggestions.length, setTopicSuggestions, setIsLoadingSuggestions]);

  const handleSelectSuggestion = (suggestion: (typeof topicSuggestions)[0]) => {
    selectTopic({
      source: 'ai-suggested',
      title: suggestion.title,
      description: suggestion.description,
      tags: suggestion.tags,
    });
  };

  const handleCustomTopic = () => {
    if (!customTitle.trim()) return;
    selectTopic({
      source: 'user-input',
      title: customTitle.trim(),
    });
  };

  return (
    <div>
      <h2 className='text-lg font-semibold mb-4'>1단계: 주제 선택</h2>
      <p className='text-sm text-muted-foreground mb-6'>
        AI 추천 주제를 선택하거나 직접 입력하세요.
      </p>

      {/* AI suggestions */}
      <div className='space-y-3 mb-6'>
        {isLoadingSuggestions ? (
          [1, 2, 3].map((i) => (
            <div key={i} className='h-16 rounded-lg bg-muted animate-pulse' />
          ))
        ) : (
          topicSuggestions.map((s, i) => (
            <button
              key={i}
              type='button'
              onClick={() => handleSelectSuggestion(s)}
              className={`w-full text-left rounded-lg border p-4 transition-all ${
                topic?.title === s.title
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/30'
              }`}
            >
              <p className='font-medium text-sm'>{s.title}</p>
              <p className='text-xs text-muted-foreground mt-1'>{s.description}</p>
              {s.tags.length > 0 && (
                <div className='flex gap-1.5 mt-2'>
                  {s.tags.map((tag) => (
                    <span key={tag} className='text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground'>
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </button>
          ))
        )}
      </div>

      {/* Custom input */}
      <div className='border-t border-border pt-4'>
        <p className='text-sm text-muted-foreground mb-2'>또는 직접 입력:</p>
        <div className='flex gap-2'>
          <Input
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
            placeholder='카드뉴스 주제를 입력하세요'
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCustomTopic();
            }}
          />
          <Button variant='outline' onClick={handleCustomTopic} disabled={!customTitle.trim()}>
            선택
          </Button>
        </div>
      </div>

      <div className='flex justify-end mt-8'>
        <Button onClick={nextStep} disabled={!topic}>
          다음
        </Button>
      </div>
    </div>
  );
}
