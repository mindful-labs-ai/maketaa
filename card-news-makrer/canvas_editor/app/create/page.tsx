'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase';
import CreateWizard from '@/components/create-flow/CreateWizard';
import { useCreateStore } from '@/stores/useCreateStore';

// ============================================================================
// Create Page — Protected route that renders the CreateWizard
// ============================================================================

export default function CreatePage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);
  const reset = useCreateStore((s) => s.reset);

  // Reset wizard state on every mount so previous session doesn't persist
  useEffect(() => {
    reset();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const client = getBrowserClient();
        const {
          data: { user },
        } = await client.auth.getUser();

        if (!user) {
          router.replace('/login');
          return;
        }

        setIsAuthed(true);
      } catch (err) {
        console.error('[CreatePage] Auth check failed:', err);
        router.replace('/login');
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [router]);

  // Auth check in progress — show dark loading screen to avoid flash
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1A1A1E' }}>
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-3 h-3 rounded-full animate-pulse"
            style={{ backgroundColor: '#4A7AFF' }}
          />
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            잠시만요...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthed) return null;

  return <CreateWizard />;
}
