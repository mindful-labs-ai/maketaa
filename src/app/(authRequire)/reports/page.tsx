'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Loader2,
  Globe,
  ArrowRight,
  FileBarChart,
  Plus,
} from 'lucide-react';

interface ReportRow {
  id: string;
  url: string;
  report: {
    businessName: string;
    businessType: string;
    summary: string;
    contentStrategy: string[];
  };
  created_at: string;
}

export default function ReportsPage() {
  const router = useRouter();
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data, error } = await supabase
        .from('marketing_reports')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setReports(data as ReportRow[]);
      }
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className='flex-1 overflow-y-auto'>
      <div className='max-w-3xl mx-auto px-6 py-10'>
        {/* Header */}
        <div className='flex items-center justify-between mb-8'>
          <div>
            <h1
              className='text-2xl font-bold'
              style={{ color: 'var(--text-primary)' }}
            >
              마케팅 리포트
            </h1>
            <p className='text-sm mt-1' style={{ color: 'var(--text-secondary)' }}>
              AI가 분석한 비즈니스 마케팅 전략을 확인하세요
            </p>
          </div>
          <Link
            href='/analyze'
            className='inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all hover:opacity-90'
            style={{
              background: 'linear-gradient(135deg, #7C5CFC, #5B8DEF)',
              color: '#fff',
            }}
          >
            <Plus className='w-4 h-4' />
            새 분석
          </Link>
        </div>

        {/* Loading */}
        {loading && (
          <div className='flex items-center justify-center py-20'>
            <Loader2 className='w-6 h-6 animate-spin' style={{ color: 'var(--brand-primary)' }} />
          </div>
        )}

        {/* Empty state */}
        {!loading && reports.length === 0 && (
          <div
            className='flex flex-col items-center justify-center py-20 rounded-2xl'
            style={{
              background: 'var(--surface-1)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <FileBarChart className='w-12 h-12 mb-4' style={{ color: 'var(--text-tertiary)' }} />
            <p className='text-base font-medium mb-2' style={{ color: 'var(--text-primary)' }}>
              아직 분석한 리포트가 없습니다
            </p>
            <p className='text-sm mb-6' style={{ color: 'var(--text-secondary)' }}>
              비즈니스 웹사이트를 분석하고 맞춤 마케팅 전략을 받아보세요
            </p>
            <Link
              href='/analyze'
              className='inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all hover:opacity-90'
              style={{
                background: 'linear-gradient(135deg, #7C5CFC, #5B8DEF)',
                color: '#fff',
              }}
            >
              첫 분석 시작하기
              <ArrowRight className='w-4 h-4' />
            </Link>
          </div>
        )}

        {/* Report list */}
        {!loading && reports.length > 0 && (
          <div className='flex flex-col gap-4'>
            {reports.map((row) => {
              const r = row.report;
              const date = new Date(row.created_at);
              const dateStr = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;

              return (
                <button
                  key={row.id}
                  onClick={() => router.push(`/report/${row.id}`)}
                  className='text-left rounded-xl p-5 transition-all hover:translate-y-[-1px]'
                  style={{
                    background: 'var(--surface-1)',
                    border: '1px solid var(--border-default)',
                  }}
                >
                  <div className='flex items-start gap-4'>
                    <div
                      className='w-10 h-10 rounded-xl flex items-center justify-center shrink-0'
                      style={{ background: 'var(--accent-subtle)' }}
                    >
                      <Globe className='w-5 h-5' style={{ color: '#7C5CFC' }} />
                    </div>
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center gap-2 mb-1'>
                        <span
                          className='text-base font-semibold truncate'
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {r.businessName}
                        </span>
                        <span
                          className='text-xs px-2 py-0.5 rounded-full shrink-0'
                          style={{ background: 'rgba(124,92,252,0.12)', color: '#A78BFA' }}
                        >
                          {r.businessType}
                        </span>
                      </div>
                      <p
                        className='text-sm line-clamp-2 mb-2'
                        style={{ color: 'var(--text-secondary)', lineHeight: '1.5' }}
                      >
                        {r.summary}
                      </p>
                      <div className='flex items-center gap-3'>
                        <span className='text-xs' style={{ color: 'var(--text-tertiary)' }}>
                          {dateStr}
                        </span>
                        <span className='text-xs flex items-center gap-1 truncate' style={{ color: 'var(--text-tertiary)' }}>
                          <Globe className='w-3 h-3' />
                          {row.url}
                        </span>
                      </div>
                    </div>
                    <ArrowRight className='w-5 h-5 shrink-0 mt-2' style={{ color: 'var(--text-tertiary)' }} />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
