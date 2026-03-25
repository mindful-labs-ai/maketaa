'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthHydration } from '@/lib/shared/useAuthHydration';
import { useAuthStore } from '@/lib/shared/useAuthStore';

const AuthRequired = ({ children }: { children: React.ReactNode }) => {
  const ready = useAuthHydration();
  const userId = useAuthStore((s) => s.userId);
  const router = useRouter();

  useEffect(() => {
    if (ready && !userId) {
      router.replace('/login');
    }
  }, [ready, userId, router]);

  if (!ready) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='w-5 h-5 border-2 border-muted border-t-primary rounded-full animate-spin' />
      </div>
    );
  }

  if (!userId) return null;

  return <>{children}</>;
};

export default AuthRequired;
