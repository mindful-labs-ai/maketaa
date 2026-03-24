'use client';

import { useCreateStore } from '@/stores/card-news/useCreateStore';
import { Button } from '@/components/ui/button';

export default function GeneratingScreen() {
  const { generationProgress, generationError, isGenerating, reset } = useCreateStore();

  if (generationError) {
    return (
      <div className='flex flex-col items-center justify-center py-20 text-center'>
        <div className='text-red-500 text-4xl mb-4'>!</div>
        <p className='text-lg font-semibold mb-2'>생성 실패</p>
        <p className='text-sm text-muted-foreground mb-6'>{generationError}</p>
        <div className='flex gap-3'>
          <Button variant='outline' onClick={reset}>
            처음부터 다시
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className='flex flex-col items-center justify-center py-20 text-center'>
      <div className='w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6' />
      <p className='text-lg font-semibold mb-2'>카드뉴스를 생성하고 있습니다</p>
      <p className='text-sm text-muted-foreground animate-pulse'>
        {generationProgress || 'AI가 열심히 작업 중입니다...'}
      </p>
    </div>
  );
}
