'use client';

import { Sparkles, Upload, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export const BlurredGenerateVideoWithUpload = () => {
  return (
    <div className='w-full max-w-3xl mx-auto px-6 py-10 space-y-8 blur-xs'>
      {/* Header */}
      <div>
        <h2 className='text-2xl font-bold text-[--text-primary]'>AI 비디오 생성</h2>
        <p className='text-sm text-[--text-secondary] mt-1'>
          이미지에서 AI 비디오를 생성하세요
        </p>
      </div>

      {/* Prompt */}
      <Textarea
        placeholder='영상으로 만들 동작이나 장면을 설명해주세요...'
        className='min-h-[140px] bg-[--surface-2] border-[--border-subtle] text-[--text-primary] placeholder:text-[--text-tertiary] text-base resize-none rounded-xl p-4'
      />

      {/* Ratio pills */}
      <div className='space-y-2'>
        <label className='text-sm font-medium text-[--text-secondary]'>화면 비율</label>
        <div className='flex flex-wrap gap-2'>
          {['16:9', '4:3', '1:1', '3:4', '9:16'].map((r, i) => (
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

      {/* Settings row */}
      <div className='grid grid-cols-3 gap-4'>
        <div className='space-y-2'>
          <label className='text-sm font-medium text-[--text-secondary]'>영상 길이</label>
          <div className='flex rounded-lg overflow-hidden border border-[--border-subtle]'>
            <span className='flex-1 px-3 py-2 text-sm font-medium text-center bg-primary text-primary-foreground'>5초</span>
            <span className='flex-1 px-3 py-2 text-sm font-medium text-center bg-[--surface-1] text-[--text-secondary]'>10초</span>
          </div>
        </div>
        <div className='space-y-2'>
          <label className='text-sm font-medium text-[--text-secondary]'>생성 AI</label>
          <div className='flex items-center gap-2 px-3 py-2 rounded-lg border border-[--border-subtle] bg-[--surface-1]'>
            <div className='w-2 h-2 rounded-full bg-[--success]' />
            <span className='text-sm text-[--text-primary]'>SeeDance</span>
          </div>
        </div>
        <div className='space-y-2'>
          <label className='text-sm font-medium text-[--text-secondary]'>모델</label>
          <div className='flex rounded-lg overflow-hidden border border-[--border-subtle]'>
            <span className='flex-1 px-3 py-2 text-sm font-medium text-center bg-primary text-primary-foreground'>Pro</span>
            <span className='flex-1 px-3 py-2 text-sm font-medium text-center bg-[--surface-1] text-[--text-secondary]'>Lite</span>
          </div>
        </div>
      </div>

      {/* Frame upload area */}
      <div className='rounded-xl border border-[--border-subtle] bg-[--surface-1] p-4'>
        <div className='flex items-center gap-4'>
          <div className='flex-1 border-2 border-dashed border-[--border-default] rounded-xl p-4 text-center'>
            <Upload className='mx-auto h-6 w-6 text-[--text-tertiary] mb-1' />
            <p className='text-xs text-[--text-secondary]'>스타트 프레임</p>
          </div>
          <div className='flex-1 border-2 border-dashed border-[--border-default] rounded-xl p-4 text-center'>
            <span className='text-xs text-[--text-tertiary]'>+ 엔드 프레임 추가</span>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className='space-y-3'>
        <Button className='w-full h-12 text-base font-semibold rounded-xl bg-primary text-primary-foreground'>
          <Sparkles className='mr-2 h-5 w-5' /> SEE_DANCE 생성
        </Button>
        <Button variant='outline' className='w-full h-12 text-base font-semibold rounded-xl border-[--border-default]'>
          <Play className='mr-2 h-5 w-5' /> 영상 읽어오기
        </Button>
      </div>
    </div>
  );
};
