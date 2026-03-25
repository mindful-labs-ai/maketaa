'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }
    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <div className='min-h-screen flex flex-col items-center justify-center px-4 gap-6'>
        {/* Logo above card */}
        <div className='flex flex-col items-center gap-1'>
          <span
            className='text-2xl font-bold tracking-tight'
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
          </span>
          <div
            style={{
              width: 40,
              height: 3,
              background: 'var(--brand-primary)',
              borderRadius: 2,
            }}
          />
        </div>

        <div
          className='w-full max-w-[400px] rounded-2xl p-8 flex flex-col items-center gap-5 text-center'
          style={{
            background: 'var(--surface-1)',
            border: '1px solid rgba(42, 42, 58, 0.4)',
          }}
        >
          <div
            className='w-14 h-14 rounded-full flex items-center justify-center text-2xl'
            style={{ background: 'rgba(52,211,153,0.12)' }}
          >
            ✉️
          </div>
          <div>
            <h2
              className='text-xl font-bold mb-2'
              style={{ color: 'var(--text-primary)' }}
            >
              이메일을 확인해주세요
            </h2>
            <p
              className='text-sm leading-relaxed'
              style={{ color: 'var(--text-secondary)' }}
            >
              <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                {email}
              </span>
              로 인증 메일을 발송했습니다.
              <br />
              이메일의 링크를 클릭하여 가입을 완료하세요.
            </p>
          </div>
          <Link
            href='/login'
            className='text-sm font-semibold transition-opacity hover:opacity-80'
            style={{ color: '#7C5CFC' }}
          >
            로그인 페이지로 이동
          </Link>
        </div>

        {/* Footer */}
        <p
          className='text-xs tracking-widest uppercase'
          style={{ color: 'var(--text-tertiary)' }}
        >
          © 2026 MAKETAA. EDITORIAL INTELLIGENCE.
        </p>
      </div>
    );
  }

  return (
    <div className='min-h-screen flex flex-col items-center justify-center px-4 gap-6'>
      {/* Logo above card */}
      <div className='flex flex-col items-center gap-1'>
        <span
          className='text-2xl font-bold tracking-tight'
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
        </span>
        <div
          style={{
            width: 40,
            height: 3,
            background: 'var(--brand-primary)',
            borderRadius: 2,
          }}
        />
      </div>

      {/* Card */}
      <div
        className='w-full max-w-[400px] rounded-2xl p-8 flex flex-col gap-6'
        style={{
          background: 'var(--surface-1)',
          border: '1px solid rgba(42, 42, 58, 0.4)',
        }}
      >
        {/* Card header */}
        <div>
          <h1
            className='text-xl font-bold'
            style={{ color: 'var(--text-primary)' }}
          >
            회원가입
          </h1>
          <p className='text-sm mt-1' style={{ color: 'var(--text-secondary)' }}>
            Maketaa와 함께 성장을 시작하세요
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
                placeholder='최소 6자 이상'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete='new-password'
                disabled={loading}
                className='pr-10'
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

          <div className='flex flex-col gap-1.5'>
            <label
              htmlFor='confirm-password'
              className='text-sm font-medium'
              style={{ color: 'var(--text-secondary)' }}
            >
              비밀번호 확인
            </label>
            <div className='relative'>
              <Input
                id='confirm-password'
                type={showConfirm ? 'text' : 'password'}
                placeholder='비밀번호를 다시 입력하세요'
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete='new-password'
                disabled={loading}
                className='pr-10'
                aria-invalid={
                  confirmPassword.length > 0 && password !== confirmPassword
                    ? 'true'
                    : undefined
                }
              />
              <button
                type='button'
                aria-label={showConfirm ? '비밀번호 숨기기' : '비밀번호 표시'}
                onClick={() => setShowConfirm((v) => !v)}
                className='absolute right-3 top-1/2 -translate-y-1/2 transition-colors'
                style={{ color: 'var(--text-tertiary)' }}
                tabIndex={-1}
              >
                {showConfirm ? (
                  <EyeOff className='w-4 h-4' />
                ) : (
                  <Eye className='w-4 h-4' />
                )}
              </button>
            </div>
            {confirmPassword.length > 0 && password !== confirmPassword && (
              <p className='text-xs' style={{ color: 'var(--error)' }}>
                비밀번호가 일치하지 않습니다.
              </p>
            )}
          </div>

          {/* Terms checkbox */}
          <label
            className='flex items-center gap-2 text-sm'
            style={{ color: 'var(--text-secondary)' }}
          >
            <input
              type='checkbox'
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              disabled={loading}
            />
            서비스 이용약관 및 개인정보 처리방침에 동의합니다.
          </label>

          <Button
            type='submit'
            className='w-full mt-1 font-semibold h-10'
            disabled={loading || !agreedToTerms}
            style={{
              background: 'linear-gradient(135deg, #7C5CFC, #5B8DEF)',
              color: '#fff',
              border: 'none',
            }}
          >
            {loading ? (
              <>
                <Loader2 className='w-4 h-4 animate-spin' />
                가입 중...
              </>
            ) : (
              <>
                회원가입
                <ArrowRight className='w-4 h-4 ml-1' />
              </>
            )}
          </Button>
        </form>

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
          Google로 가입하기
        </Button>

        {/* Login link */}
        <p
          className='text-center text-sm'
          style={{ color: 'var(--text-secondary)' }}
        >
          이미 계정이 있으신가요?{' '}
          <Link
            href='/login'
            className='font-semibold transition-colors hover:opacity-80'
            style={{ color: '#7C5CFC' }}
          >
            로그인
          </Link>
        </p>
      </div>

      {/* Footer copyright */}
      <p
        className='text-xs tracking-widest uppercase'
        style={{ color: 'var(--text-tertiary)' }}
      >
        © 2026 MAKETAA. EDITORIAL INTELLIGENCE.
      </p>
    </div>
  );
}
