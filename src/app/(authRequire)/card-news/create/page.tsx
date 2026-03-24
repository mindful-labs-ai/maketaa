'use client';

import { useEffect } from 'react';
import { useCreateStore } from '@/stores/card-news/useCreateStore';
import CreateWizard from '@/components/card-news/create-flow/CreateWizard';

export default function CardNewsCreatePage() {
  const reset = useCreateStore((s) => s.reset);

  useEffect(() => {
    reset();
  }, [reset]);

  return (
    <div className='p-8 max-w-3xl mx-auto'>
      <CreateWizard />
    </div>
  );
}
