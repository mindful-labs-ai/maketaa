'use client';

import { useCreateStore } from '@/stores/card-news/useCreateStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ContentPurpose } from '@/lib/card-news/types';

const PURPOSE_OPTIONS: { type: ContentPurpose; label: string; description: string }[] = [
  {
    type: 'informational',
    label: '정보 전달',
    description: '지식, 팁, 인사이트를 공유하는 교육적 콘텐츠',
  },
  {
    type: 'action-driven',
    label: '행동 유도',
    description: '팔로우, 댓글, 링크 클릭 등 특정 행동을 유도',
  },
  {
    type: 'auto',
    label: 'AI 자동 판단',
    description: '주제에 가장 적합한 구성을 AI가 결정',
  },
];

export default function StepPurpose() {
  const { purpose, setPurpose, nextStep, prevStep } = useCreateStore();

  const handleSelect = (type: ContentPurpose) => {
    setPurpose({
      type,
      cta: type === 'action-driven' ? { type: 'follow', text: '팔로우하기' } : undefined,
    });
  };

  return (
    <div>
      <h2 className='text-lg font-semibold mb-4'>2단계: 목적 설정</h2>
      <p className='text-sm text-muted-foreground mb-6'>
        카드뉴스의 목적을 선택하세요.
      </p>

      <div className='space-y-3 mb-6'>
        {PURPOSE_OPTIONS.map((opt) => (
          <button
            key={opt.type}
            type='button'
            onClick={() => handleSelect(opt.type)}
            className={`w-full text-left rounded-lg border p-4 transition-all ${
              purpose?.type === opt.type
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/30'
            }`}
          >
            <p className='font-medium text-sm'>{opt.label}</p>
            <p className='text-xs text-muted-foreground mt-1'>{opt.description}</p>
          </button>
        ))}
      </div>

      {purpose?.type === 'action-driven' && (
        <div className='border rounded-lg p-4 mb-6'>
          <p className='text-sm font-medium mb-2'>CTA 텍스트</p>
          <Input
            value={purpose.cta?.text || ''}
            onChange={(e) =>
              setPurpose({
                ...purpose,
                cta: { ...purpose.cta!, text: e.target.value },
              })
            }
            placeholder='예: 팔로우하기, 더 알아보기'
          />
        </div>
      )}

      <div className='flex justify-between mt-8'>
        <Button variant='outline' onClick={prevStep}>
          이전
        </Button>
        <Button onClick={nextStep} disabled={!purpose}>
          다음
        </Button>
      </div>
    </div>
  );
}
