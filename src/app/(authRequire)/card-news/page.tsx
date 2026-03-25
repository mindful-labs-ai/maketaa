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
      <div>
        <div className='px-6 pt-6 pb-4'>
          <div className='flex items-center justify-between'>
            <h1 className='text-2xl font-bold text-[--text-primary]'>카드뉴스</h1>
          </div>
        </div>
        <div className='px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
          {[1, 2, 3].map((i) => (
            <div key={i} className='h-48 rounded-xl bg-muted animate-pulse' />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='px-6 pt-6'>
        <p className='text-red-500'>{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className='px-6 pt-6 pb-4'>
        <div className='flex items-center justify-between'>
          <h1 className='text-2xl font-bold text-[--text-primary]'>카드뉴스</h1>
          <Link href='/card-news/create'>
            <Button>+ 새로 만들기</Button>
          </Link>
        </div>
      </div>

      <div className='px-6'>
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
          {specs.map((spec) => {
            const coverCard = spec.spec?.cards?.[0];
            const coverSrc = coverCard?.background?.src;
            const palette = coverCard?.style?.color_palette;
            const cardCount = spec.spec?.cards?.length ?? 0;

            return (
              <Link
                key={spec.id}
                href={`/card-news/editor/${spec.id}`}
                className='group block rounded-xl border border-border bg-card overflow-hidden hover:border-primary/50 hover:shadow-md transition-all'
              >
                {/* Preview thumbnail */}
                <div
                  className='relative w-full aspect-[4/3] bg-[--surface-2]'
                  style={
                    coverSrc
                      ? undefined
                      : {
                          background: palette
                            ? `linear-gradient(135deg, ${palette.primary ?? '#374151'}, ${palette.secondary ?? '#6b7280'})`
                            : 'linear-gradient(135deg, #374151, #6b7280)',
                        }
                  }
                >
                  {coverSrc && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={coverSrc}
                      alt={spec.topic}
                      className='w-full h-full object-cover'
                    />
                  )}
                  {!coverSrc && coverCard?.text?.headline && (
                    <div className='absolute inset-0 flex items-center justify-center p-4'>
                      <p className='text-white/80 text-sm font-medium text-center line-clamp-3'>
                        {coverCard.text.headline}
                      </p>
                    </div>
                  )}
                  {/* Card count badge */}
                  {cardCount > 0 && (
                    <div className='absolute bottom-2 right-2 bg-black/60 text-white text-[11px] font-medium px-2 py-0.5 rounded-md backdrop-blur-sm'>
                      {cardCount}장
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className='p-4'>
                  <div className='flex items-start justify-between gap-2 mb-1.5'>
                    <h3 className='font-semibold text-sm line-clamp-2'>
                      {spec.topic}
                    </h3>
                    <span className='text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground whitespace-nowrap shrink-0'>
                      {CARD_STATUS[spec.status as keyof typeof CARD_STATUS] || spec.status}
                    </span>
                  </div>
                  <p className='text-xs text-muted-foreground'>
                    {formatDate(spec.created_at)}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
}
