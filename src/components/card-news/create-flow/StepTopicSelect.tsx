'use client';

import { useState } from 'react';
import { useCreateStore } from '@/stores/card-news/useCreateStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { TopicSelection } from '@/lib/card-news/types';
import { creditFetch } from '@/lib/credits/creditFetch';

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
  const [keyword, setKeyword] = useState('');

  const fetchSuggestions = async () => {
    setIsLoadingSuggestions(true);
    try {
      const res = await creditFetch('/api/card-news/suggest-topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: keyword.trim() || undefined }),
      });
      if (res.ok) {
        const data = await res.json();
        setTopicSuggestions(data.topics || []);
      }
    } catch {
      // silently fail
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

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
        AI 추천 주제를 선택하거나 직접 입력하세요. (추천 시 1 크레딧 소모)
      </p>

      {/* AI suggestions */}
      <div className='space-y-3 mb-6'>
        {topicSuggestions.length === 0 && !isLoadingSuggestions ? (
          <div className='space-y-2'>
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder='키워드 입력 (예: 마케팅, 건강, 재테크...)'
              onKeyDown={(e) => {
                if (e.key === 'Enter') fetchSuggestions();
              }}
            />
            <Button
              variant='outline'
              className='w-full py-6'
              onClick={fetchSuggestions}
            >
              {keyword.trim() ? `"${keyword.trim()}" 관련 AI 주제 추천 받기` : 'AI 주제 추천 받기'}
            </Button>
          </div>
        ) : isLoadingSuggestions ? (
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
        {topicSuggestions.length > 0 && !isLoadingSuggestions && (
          <div className='space-y-2'>
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder='키워드 입력 (예: 마케팅, 건강, 재테크...)'
              onKeyDown={(e) => {
                if (e.key === 'Enter') fetchSuggestions();
              }}
            />
            <Button
              variant='ghost'
              size='sm'
              className='w-full text-muted-foreground'
              onClick={fetchSuggestions}
            >
              {keyword.trim() ? `"${keyword.trim()}" 관련 다시 추천 받기` : '다시 추천 받기'}
            </Button>
          </div>
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
