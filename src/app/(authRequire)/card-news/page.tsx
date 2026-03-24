'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import type { CardSpecRecord } from '@/lib/card-news/types';
import { formatDate } from '@/lib/card-news/utils';
import { CARD_STATUS } from '@/lib/card-news/constants';

export default function CardNewsListPage() {
  const [specs, setSpecs] = useState<CardSpecRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const { data, error: dbError } = await supabase
          .from('card_specs')
          .select('*')
          .order('created_at', { ascending: false });

        if (dbError) throw dbError;
        setSpecs(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : '불러오기 실패');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className='p-8'>
        <div className='flex items-center justify-between mb-8'>
          <h1 className='text-2xl font-bold'>카드뉴스</h1>
        </div>
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
          {[1, 2, 3].map((i) => (
            <div key={i} className='h-48 rounded-xl bg-muted animate-pulse' />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='p-8'>
        <p className='text-red-500'>{error}</p>
      </div>
    );
  }

  return (
    <div className='p-8'>
      <div className='flex items-center justify-between mb-8'>
        <h1 className='text-2xl font-bold'>카드뉴스</h1>
        <Link href='/card-news/create'>
          <Button>+ 새로 만들기</Button>
        </Link>
      </div>

      {specs.length === 0 ? (
        <div className='flex flex-col items-center justify-center py-20 text-center'>
          <p className='text-lg text-muted-foreground mb-4'>
            아직 카드뉴스가 없습니다
          </p>
          <Link href='/card-news/create'>
            <Button size='lg'>첫 카드뉴스 만들기</Button>
          </Link>
        </div>
      ) : (
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
          {specs.map((spec) => (
            <Link
              key={spec.id}
              href={`/card-news/editor/${spec.id}`}
              className='block rounded-xl border border-border bg-card p-5 hover:border-primary/50 hover:shadow-md transition-all'
            >
              <div className='flex items-start justify-between mb-3'>
                <h3 className='font-semibold text-sm line-clamp-2'>
                  {spec.topic}
                </h3>
                <span className='text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground whitespace-nowrap ml-2'>
                  {CARD_STATUS[spec.status as keyof typeof CARD_STATUS] || spec.status}
                </span>
              </div>
              <p className='text-xs text-muted-foreground'>
                {formatDate(spec.created_at)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
