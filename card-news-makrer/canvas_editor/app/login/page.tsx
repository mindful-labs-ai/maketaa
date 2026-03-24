'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserClient, isAuthenticated } from '@/lib/supabase';
import { Mail, Lock, AlertCircle, Loader } from 'lucide-react';

// ============================================================================
// Component
// ============================================================================

export default function LoginPage() {
  const router = useRouter();

  // State
  const [authMode, setAuthMode] = useState<'magic-link' | 'password'>('magic-link');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Check if already authenticated (해시 토큰 포함 시에도 처리)
  useEffect(() => {
    const client = getBrowserClient();
    const hasHashToken = window.location.hash?.includes('access_token');

    if (hasHashToken) {
      // 로그인 페이지에 #access_token으로 리다이렉트된 경우
      // Supabase 클라이언트가 해시에서 세션을 자동 추출하므로
      // onAuthStateChange로 세션 확립을 대기 후 대시보드로 이동
      const { data: { subscription } } = client.auth.onAuthStateChange(
        (event, session) => {
          if (event === 'SIGNED_IN' && session) {
            subscription.unsubscribe();
            router.push('/');
          }
        }
      );

      const timeout = setTimeout(() => {
        subscription.unsubscribe();
      }, 10000);

      return () => {
        clearTimeout(timeout);
        subscription.unsubscribe();
      };
    }

    const checkAuth = async () => {
      const authenticated = await isAuthenticated();
      if (authenticated) {
        router.push('/');
      }
    };
    checkAuth();
  }, [router]);

  // =========================================================================
  // Magic Link Login
  // =========================================================================

  const handleMagicLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setSuccessMessage(null);

      const client = getBrowserClient();
      // 프로덕션에서는 NEXT_PUBLIC_SITE_URL 사용, 없으면 현재 origin 사용
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      const { error: signInError } = await client.auth.signInWithOtp({
        email: email.toLowerCase().trim(),
        options: {
          emailRedirectTo: `${siteUrl}/auth/callback`,
        },
      });

      if (signInError) {
        setError(signInError.message);
      } else {
        setSuccessMessage(
          'Magic link sent! Please check your email and click the link to sign in.'
        );
        setEmail('');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      console.error('[LoginPage] Magic link error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // =========================================================================
  // Password Login
  // =========================================================================

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setSuccessMessage(null);

      const client = getBrowserClient();
      const { error: signInError, data } = await client.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });

      if (signInError) {
        setError(signInError.message);
      } else if (data.session) {
        // Successful login
        router.push('/');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      console.error('[LoginPage] Password login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Canvas Editor
          </h1>
          <p className="text-gray-600">
            Mental Health Card News - Sign in to continue
          </p>
        </div>

        {/* Mode Selector */}
        <div className="flex gap-2 mb-8 bg-gray-100 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => {
              setAuthMode('magic-link');
              setError(null);
              setSuccessMessage(null);
            }}
            className={`flex-1 py-2 px-4 rounded font-medium transition-colors ${
              authMode === 'magic-link'
                ? 'bg-white text-gray-900 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Magic Link
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('password');
              setError(null);
              setSuccessMessage(null);
            }}
            className={`flex-1 py-2 px-4 rounded font-medium transition-colors ${
              authMode === 'password'
                ? 'bg-white text-gray-900 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Password
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
            <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700">{successMessage}</p>
          </div>
        )}

        {/* Magic Link Form */}
        {authMode === 'magic-link' && (
          <form onSubmit={handleMagicLinkSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail
                  size={18}
                  className="absolute left-3 top-3 text-gray-400"
                />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  disabled={isLoading}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:bg-gray-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !email.trim()}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isLoading && <Loader size={16} className="animate-spin" />}
              {isLoading ? '보내는 중...' : '매직 링크 전송'}
            </button>

            <p className="text-xs text-gray-600 text-center mt-4">
              We'll send a magic link to your email. No password needed!
            </p>
          </form>
        )}

        {/* Password Form */}
        {authMode === 'password' && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label htmlFor="email-pw" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail
                  size={18}
                  className="absolute left-3 top-3 text-gray-400"
                />
                <input
                  id="email-pw"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  disabled={isLoading}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:bg-gray-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock
                  size={18}
                  className="absolute left-3 top-3 text-gray-400"
                />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isLoading}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:bg-gray-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !email.trim() || !password.trim()}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isLoading && <Loader size={16} className="animate-spin" />}
              {isLoading ? '로그인 중...' : '로그인'}
            </button>
          </form>
        )}

        {/* Footer */}
        <p className="text-xs text-gray-500 text-center mt-6">
          Card Editor MVP • Canvas Editor for Mental Health Card News
        </p>
      </div>
    </div>
  );
}
