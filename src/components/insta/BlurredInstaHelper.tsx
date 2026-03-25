'use client';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const BlurredInstagHelper = () => {
  const TopBar = (
    <div className='flex items-center justify-between'>
      <h1 className='text-2xl font-bold text-[--text-primary]'>Instagram 댓글/답글 생성기</h1>
      <div className='flex gap-2'>
        <Button>댓글/답글</Button>
        <Button>캡션(택틱)</Button>
      </div>
    </div>
  );

  const Options = (
    <div className="space-y-3 rounded-xl border border-[--border-subtle] bg-[--surface-1] p-4">
      <label className='text-sm font-medium'>문체 프롬프트</label>
      <Textarea className='min-h-[80px]' />
      <div className='flex gap-2 items-center'>
        <label className='text-sm font-medium'>언어</label>
        <Select defaultValue='ko'>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ko">한국어</SelectItem>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="ja">日本語</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <div className='blur-xs'>
      <div className='px-6 pt-6 pb-4'>
        {TopBar}
      </div>
      <div className='px-6 pb-6 space-y-6'>
        {Options}
      </div>
    </div>
  );
};

export default BlurredInstagHelper;
