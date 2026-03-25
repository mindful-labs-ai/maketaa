'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.');
      setLoading(false);
      return;
    }

    // Check for pending marketing report from landing page
    const pendingReportId = localStorage.getItem('pending_report_id');
    if (pendingReportId) {
      try {
        await fetch('/api/analyze/claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reportId: pendingReportId }),
        });
        router.push(`/report/${pendingReportId}`);
        return;
      } catch {
        // If claim fails, still go to default page
      }
    }

    router.push('/makerScript');
  };

  return (
    <div className='min-h-screen flex flex-col items-center justify-center px-4 gap-8'>
      <div
        className='w-full max-w-[400px] rounded-2xl p-8 flex flex-col gap-6'
        style={{
          background: 'var(--surface-1)',
          border: '1px solid rgba(42, 42, 58, 0.4)',
        }}
      >
        {/* Logo */}
        <div className='text-center'>
          <Link
            href='/'
            className='text-2xl font-bold tracking-tight inline-block transition-opacity hover:opacity-80'
            style={{ color: 'var(--text-primary)' }}
          >
            Mak
            <span
              style={{
                background: 'linear-gradient(90deg, #7C5CFC, #5B8DEF)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              etaa
            </span>
          </Link>
          <h1
            className='text-lg font-semibold mt-4'
            style={{ color: 'var(--text-primary)' }}
          >
            로그인
          </h1>
          <p className='text-sm mt-1' style={{ color: 'var(--text-secondary)' }}>
            계정에 로그인하여 계속하세요
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div
            className='px-4 py-3 rounded-lg text-sm'
            style={{
              background: 'rgba(248,113,113,0.1)',
              border: '1px solid rgba(248,113,113,0.3)',
              color: 'var(--error)',
            }}
            role='alert'
          >
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
          <div className='flex flex-col gap-1.5'>
            <label
              htmlFor='email'
              className='text-sm font-medium'
              style={{ color: 'var(--text-secondary)' }}
            >
              이메일
            </label>
            <Input
              id='email'
              type='email'
              placeholder='name@example.com'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete='email'
              disabled={loading}
              className='focus-visible:ring-0 focus-visible:border-[var(--brand-primary)] focus-visible:[box-shadow:0_0_0_2px_rgba(124,92,252,0.15)]'
            />
          </div>

          <div className='flex flex-col gap-1.5'>
            <label
              htmlFor='password'
              className='text-sm font-medium'
              style={{ color: 'var(--text-secondary)' }}
            >
              비밀번호
            </label>
            <div className='relative'>
              <Input
                id='password'
                type={showPassword ? 'text' : 'password'}
                placeholder='비밀번호를 입력하세요'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete='current-password'
                disabled={loading}
                className='pr-10 focus-visible:ring-0 focus-visible:border-[var(--brand-primary)] focus-visible:[box-shadow:0_0_0_2px_rgba(124,92,252,0.15)]'
              />
              <button
                type='button'
                aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 표시'}
                onClick={() => setShowPassword((v) => !v)}
                className='absolute right-3 top-1/2 -translate-y-1/2 transition-colors'
                style={{ color: 'var(--text-tertiary)' }}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className='w-4 h-4' />
                ) : (
                  <Eye className='w-4 h-4' />
                )}
              </button>
            </div>
          </div>

          <Button
            type='submit'
            className='w-full mt-1 font-semibold h-10 gap-2'
            disabled={loading}
            style={{
              background: 'linear-gradient(135deg, #7C5CFC, #5B8DEF)',
              color: '#fff',
              border: 'none',
            }}
          >
            {loading ? (
              <>
                <Loader2 className='w-4 h-4 animate-spin' />
                로그인 중...
              </>
            ) : (
              <>
                로그인
                <ArrowRight className='w-4 h-4' />
              </>
            )}
          </Button>
        </form>

        {/* Forgot password */}
        <div className='text-center -mt-2'>
          <Link
            href='/forgot-password'
            className='text-sm transition-colors hover:opacity-80'
            style={{ color: 'var(--brand-primary)' }}
          >
            비밀번호를 잊으셨나요?
          </Link>
        </div>

        {/* Separator */}
        <div
          className='flex items-center gap-3'
          style={{ color: 'var(--text-tertiary)' }}
        >
          <div
            className='flex-1 h-px'
            style={{ background: 'var(--border-subtle)' }}
          />
          <span className='text-xs'>또는</span>
          <div
            className='flex-1 h-px'
            style={{ background: 'var(--border-subtle)' }}
          />
        </div>

        {/* Google Login */}
        <Button
          type='button'
          variant='outline'
          className='w-full h-10 font-medium gap-2'
          disabled={loading}
          onClick={() => {
            const supabase = createClient();
            supabase.auth.signInWithOAuth({
              provider: 'google',
              options: { redirectTo: `${window.location.origin}/auth/callback` },
            });
          }}
        >
          <svg className='w-4 h-4' viewBox='0 0 24 24'>
            <path
              d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z'
              fill='#4285F4'
            />
            <path
              d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
              fill='#34A853'
            />
            <path
              d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'
              fill='#FBBC05'
            />
            <path
              d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
              fill='#EA4335'
            />
          </svg>
          Google로 로그인
        </Button>

        {/* Sign up link */}
        <p
          className='text-center text-sm'
          style={{ color: 'var(--text-secondary)' }}
        >
          계정이 없으신가요?{' '}
          <Link
            href='/signup'
            className='font-semibold transition-colors hover:opacity-80'
            style={{ color: '#7C5CFC' }}
          >
            회원가입
          </Link>
        </p>
      </div>

      {/* Footer copyright */}
      <p
        className='text-xs uppercase tracking-widest text-center'
        style={{ color: 'var(--text-tertiary)' }}
      >
        © 2026 MAKETAA. EDITORIAL INTELLIGENCE.
      </p>
    </div>
  );
}
