'use client';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FileImage, Sparkles } from 'lucide-react';

export const BlurredGenerateImageWithGemini = () => {
  return (
    <div className='w-full max-w-3xl mx-auto px-6 py-10 space-y-8 blur-xs'>
      {/* Header */}
      <div>
        <h2 className='text-2xl font-bold text-[--text-primary]'>AI 이미지 생성</h2>
        <p className='text-sm text-[--text-secondary] mt-1'>
          프롬프트를 입력하면 AI가 고품질 이미지를 만들어드립니다
        </p>
      </div>

      {/* Prompt */}
      <Textarea
        placeholder='만들고 싶은 이미지를 설명해주세요...'
        className='min-h-[160px] bg-[--surface-2] border-[--border-subtle] text-[--text-primary] placeholder:text-[--text-tertiary] text-base resize-none rounded-xl p-4'
      />

      {/* Ratio pills */}
      <div className='space-y-3'>
        <label className='text-sm font-medium text-[--text-secondary]'>화면 비율</label>
        <div className='flex flex-wrap gap-2'>
          {['1:1', '3:2', '4:3', '9:16', '16:9'].map((r, i) => (
            <span
              key={r}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium ${
                i === 0
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-[--surface-2] text-[--text-secondary] border border-[--border-subtle]'
              }`}
            >
              {r}
            </span>
          ))}
        </div>
      </div>

      {/* Collapsible ref section */}
      <div className='rounded-xl border border-[--border-subtle] overflow-hidden'>
        <div className='flex items-center justify-between px-4 py-3 bg-[--surface-1]'>
          <div className='flex items-center gap-2'>
            <FileImage className='w-4 h-4 text-[--text-secondary]' />
            <span className='text-sm font-medium text-[--text-primary]'>참조 이미지</span>
          </div>
        </div>
      </div>

      {/* Generate button */}
      <Button className='w-full h-12 text-base font-semibold rounded-xl bg-primary text-primary-foreground'>
        <Sparkles className='mr-2 h-5 w-5' /> Gemini로 이미지 생성
      </Button>
    </div>
  );
};
