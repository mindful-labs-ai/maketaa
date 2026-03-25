'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  Loader2,
  Globe,
  ArrowRight,
  Film,
  Newspaper,
  AlertCircle,
} from 'lucide-react';

interface MarketingReport {
  businessName: string;
  businessType: string;
  summary: string;
  contentStrategy: string[];
  recommendedActions: { tool: string; action: string }[];
}

interface ReportRow {
  id: string;
  url: string;
  report: MarketingReport;
  created_at: string;
}

const TOOL_ROUTES: Record<string, { href: string; icon: typeof Film }> = {
  '숏폼 메이커': { href: '/makerScript', icon: Film },
  '카드뉴스 메이커': { href: '/card-news/create', icon: Newspaper },
};

export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<ReportRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('로그인이 필요합니다.');
        setLoading(false);
        return;
      }

      const { data: row, error: dbError } = await supabase
        .from('marketing_reports')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (dbError || !row) {
        setError('리포트를 찾을 수 없습니다.');
        setLoading(false);
        return;
      }

      setData(row as ReportRow);
      setLoading(false);

      // Clear localStorage since we're now viewing the full report
      localStorage.removeItem('pending_report_id');
      localStorage.removeItem('pending_report');
      localStorage.removeItem('analyzed_url');
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className='flex-1 flex items-center justify-center py-20'>
        <Loader2 className='w-6 h-6 animate-spin' style={{ color: 'var(--brand-primary)' }} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className='flex-1 flex flex-col items-center justify-center py-20 gap-4'>
        <AlertCircle className='w-10 h-10' style={{ color: 'var(--error)' }} />
        <p className='text-base font-medium' style={{ color: 'var(--text-primary)' }}>
          {error || '리포트를 찾을 수 없습니다.'}
        </p>
        <button
          onClick={() => router.push('/dashboard')}
          className='text-sm font-medium'
          style={{ color: 'var(--brand-primary)' }}
        >
          대시보드로 이동
        </button>
      </div>
    );
  }

  const report = data.report;

  return (
    <div className='flex-1 overflow-y-auto'>
      <div className='max-w-3xl mx-auto px-6 py-10'>
        {/* Header */}
        <div className='mb-8'>
          <div
            className='inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4'
            style={{
              background: 'rgba(52,211,153,0.1)',
              border: '1px solid rgba(52,211,153,0.3)',
              color: 'var(--success)',
            }}
          >
            마케팅 전략 리포트
          </div>
          <h1
            className='text-2xl md:text-3xl font-bold mb-2'
            style={{ color: 'var(--text-primary)' }}
          >
            {report.businessName}
          </h1>
          <div className='flex items-center gap-3'>
            <span
              className='text-xs px-2.5 py-1 rounded-full font-medium'
              style={{ background: 'rgba(124,92,252,0.12)', color: '#A78BFA' }}
            >
              {report.businessType}
            </span>
            <span className='flex items-center gap-1.5 text-sm' style={{ color: 'var(--text-tertiary)' }}>
              <Globe className='w-3.5 h-3.5' />
              {data.url}
            </span>
          </div>
        </div>

        {/* Summary */}
        <div
          className='rounded-xl p-5 mb-6'
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border-subtle)' }}
        >
          <h2 className='text-sm font-semibold mb-2' style={{ color: 'var(--text-primary)' }}>
            비즈니스 요약
          </h2>
          <p className='text-sm leading-relaxed' style={{ color: 'var(--text-secondary)' }}>
            {report.summary}
          </p>
        </div>

        {/* Content Strategy */}
        <div className='mb-8'>
          <h2 className='text-lg font-bold mb-4' style={{ color: 'var(--text-primary)' }}>
            추천 콘텐츠 전략
          </h2>
          <div className='flex flex-col gap-3'>
            {report.contentStrategy.map((strategy, i) => (
              <div
                key={i}
                className='flex items-start gap-3 px-5 py-4 rounded-xl'
                style={{
                  background: 'var(--surface-1)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div
                  className='w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 mt-0.5'
                  style={{
                    background: 'linear-gradient(135deg, #7C5CFC, #5B8DEF)',
                    color: '#fff',
                  }}
                >
                  {i + 1}
                </div>
                <p className='text-sm leading-relaxed' style={{ color: 'var(--text-secondary)' }}>
                  {strategy}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Recommended Actions */}
        <div className='mb-8'>
          <h2 className='text-lg font-bold mb-4' style={{ color: 'var(--text-primary)' }}>
            지금 바로 실행하세요
          </h2>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            {report.recommendedActions.map((action, i) => {
              const route = TOOL_ROUTES[action.tool];
              const Icon = route?.icon || Film;
              const href = route?.href || '/makerScript';

              return (
                <div
                  key={i}
                  className='rounded-xl p-5 flex flex-col gap-4'
                  style={{
                    background: 'var(--surface-1)',
                    border: '1px solid var(--border-default)',
                  }}
                >
                  <div className='flex items-center gap-2'>
                    <div
                      className='w-8 h-8 rounded-lg flex items-center justify-center'
                      style={{ background: 'var(--accent-subtle)' }}
                    >
                      <Icon className='w-4 h-4' style={{ color: '#7C5CFC' }} />
                    </div>
                    <span className='text-sm font-semibold' style={{ color: 'var(--text-primary)' }}>
                      {action.tool}
                    </span>
                  </div>
                  <p className='text-sm leading-relaxed flex-1' style={{ color: 'var(--text-secondary)' }}>
                    {action.action}
                  </p>
                  <Link
                    href={href}
                    className='inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all hover:opacity-90 self-start'
                    style={{
                      background: 'linear-gradient(135deg, #7C5CFC, #5B8DEF)',
                      color: '#fff',
                    }}
                  >
                    바로 만들기
                    <ArrowRight className='w-3.5 h-3.5' />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

        {/* Back to dashboard */}
        <div className='text-center pt-4 pb-8'>
          <Link
            href='/dashboard'
            className='text-sm font-medium transition-opacity hover:opacity-80'
            style={{ color: 'var(--text-tertiary)' }}
          >
            대시보드로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}
