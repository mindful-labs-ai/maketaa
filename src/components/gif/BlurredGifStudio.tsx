'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  PlayCircle,
  Download,
  Images,
  Film,
  Upload,
  FileImage,
} from 'lucide-react';
import { TEMPLATES } from '@/lib/gif/template';

export const BlurredGifStudio = () => {
  return (
    <div className='w-full blur-xs'>
      <div className='px-6 pt-6 pb-4'>
        <h1 className='text-2xl font-bold text-[--text-primary]'>GIF 스튜디오</h1>
      </div>
      {/* 3‑pane layout */}
      <div className='px-6 grid grid-cols-12 gap-4'>
        {/* Left Sidebar — Settings */}
        <aside className='col-span-12 md:col-span-3 xl:col-span-2 border border-[--border-subtle] rounded-xl p-3 md:p-4 bg-[--surface-1] flex flex-col'>
          <div className='space-y-5'>
            <div className='space-y-3'>
              <div className='text-sm font-medium'>내 캐릭터 선택</div>

              <div
                className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors 
                `}
              >
                <input type='file' accept='image/*' className='hidden' />
                <FileImage className='mx-auto h-10 w-10 text-muted-foreground mb-3' />
                <p className='text-xs mb-3 text-muted-foreground'>
                  이미지를 드래그하거나 클릭하여 업로드
                </p>
                <Button variant='outline' size='sm'>
                  <Upload className='mr-2 h-4 w-4' /> 이미지 선택
                </Button>
              </div>
            </div>
            <div className='space-y-3'>
              <div className='text-sm font-medium'>템플릿 선택</div>
              <Select>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="템플릿을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATES.map((t, i) => (
                    <SelectItem key={t.frames[i]?.id ?? t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className='mt-auto pt-3 flex flex-col gap-2'>
            <Button className='w-full'>
              <>
                <PlayCircle className='mr-2 h-4 w-4' /> 만들기
              </>
            </Button>

            <div className='text-xs text-muted-foreground'>진행률: %</div>
            <div className='w-full h-2 rounded bg-neutral-200 overflow-hidden'>
              <div
                className='h-full bg-neutral-800 transition-all'
                style={{ width: `0%` }}
              />
            </div>
          </div>
        </aside>

        {/* Center — Pipeline */}
        <main className='col-span-12 md:col-span-6 xl:col-span-8 rounded-xl p-3 md:p-5 bg-[--surface-1] border border-[--border-subtle] overflow-y-auto'>
          <div className='flex items-center gap-2 mb-3'>
            <Images className='h-5 w-5' />
            <h3 className='font-semibold'>생성 파이프라인</h3>
            <span className='text-xs text-muted-foreground'></span>
          </div>

          <div className='text-sm text-muted-foreground'>
            왼쪽 사이드바에서 캐릭터/템플릿을 선택하고 <b>만들기</b>를 눌러
            시작하세요.
          </div>
        </main>

        <aside className='col-span-12 md:col-span-3 xl:col-span-2 border border-[--border-subtle] rounded-xl p-3 md:p-4 bg-[--surface-1] flex flex-col'>
          <div className='flex items-center gap-2 mb-2'>
            <Film className='h-5 w-5' />
            <div className='font-semibold'>갤러리 & GIF</div>
          </div>

          <div className='grid grid-cols-2 gap-2 mb-3 overflow-y-auto max-h-[40vh]'></div>

          <div className='space-y-2 mt-auto'>
            <Button className='w-full'>
              <>GIF 만들기</>
            </Button>

            <Button className='w-full' variant='outline'>
              <Download className='h-4 w-4 mr-1' /> 다운로드
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default BlurredGifStudio;
