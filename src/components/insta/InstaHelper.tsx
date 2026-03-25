'use client';

import { useState } from 'react';
import { CreditCost } from '@/components/ui/credit-cost';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import ReplyCard from '@/components/insta/ReplyCard';
import { creditFetch } from '@/lib/credits/creditFetch';

export interface AIReplyItem {
  id: string;
  author: string;
  content: string;
  reply: string;
  content_ko?: string;
  reply_ko?: string;
}

export type LanguageCode = 'ko' | 'en' | 'ja';

export interface GenerateOptions {
  stylePrompt: string;
  language?: LanguageCode;
}

export interface CaptionResult {
  script_snippet: string;
  summary: string;
  summary_ko?: string;
  related_topics: Array<{
    topic: string;
    brief: string;
    brief_ko?: string;
    source: string;
  }>;
  tactics: Array<{
    id: string;
    title: string;
    description: string;
    description_ko?: string;
    steps: string[];
    steps_ko?: string[];
    estimated_effort: 'low' | 'medium' | 'high' | string;
    time_estimate_min: string;
    time_estimate_max: string;
    priority: string;
    metrics_to_track: string[];
    source: string;
  }>;
  cta?: Record<'comment' | 'save' | 'share' | 'follow', string>;
  cta_ko?: Record<'comment' | 'save' | 'share' | 'follow', string>;
  notes?: string;
  generated_by?: string;
}

export const InstagHelper = () => {
  const [mode, setMode] = useState<'reply' | 'caption'>('reply');

  const [options, setOptions] = useState<GenerateOptions>({
    stylePrompt:
      '부드러운 존댓말, 공감/위로 톤, 이모티콘 적극 사용, 해시태그/링크 금지',
    language: 'ko',
  });

  const [rawReply, setRawReply] = useState('');
  const [replyItems, setReplyItems] = useState<AIReplyItem[]>([]);
  const [replyLoading, setReplyLoading] = useState(false);
  const [replyErr, setReplyErr] = useState<string | null>(null);

  const handleGenerateReplies = async () => {
    if (!rawReply.trim()) return;
    setReplyLoading(true);
    setReplyErr(null);
    setReplyItems([]);
    try {
      const res = await creditFetch('/api/insta-replies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw: rawReply, options }),
      });
      if (!res.ok) throw new Error(`Server ${res.status}`);
      const data = (await res.json()) as AIReplyItem[];
      if (!Array.isArray(data)) throw new Error('Invalid response');
      setReplyItems(data);
    } catch (e: any) {
      setReplyErr(e?.message || '생성 실패');
    } finally {
      setReplyLoading(false);
    }
  };

  const [rawCaption, setRawCaption] = useState('');
  const [captionText, setCaptionText] = useState(''); // ← 객체 대신 string
  const [captionLoading, setCaptionLoading] = useState(false);
  const [captionErr, setCaptionErr] = useState<string | null>(null);
  const [captionCopied, setCaptionCopied] = useState(false);

  const handleGenerateCaption = async () => {
    if (!rawCaption.trim()) return;
    setCaptionLoading(true);
    setCaptionErr(null);
    setCaptionText('');
    try {
      const res = await creditFetch('/api/insta-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: rawCaption, options }),
      });
      if (!res.ok) throw new Error(`Server ${res.status}`);
      const text = await res.text();
      setCaptionText(text);
    } catch (e: any) {
      setCaptionErr(e?.message || '생성 실패');
    } finally {
      setCaptionLoading(false);
    }
  };

  const copyCaption = async () => {
    if (!captionText) return;
    await navigator.clipboard.writeText(captionText);
  };

  /* ======== 상단 모드 토글 ======== */
  const TopBar = (
    <div className='flex items-center justify-between'>
      <h1 className='text-2xl font-bold text-[--text-primary]'>
        {mode === 'reply'
          ? 'Instagram 댓글/답글 생성기'
          : '실전 택틱 캡션 생성기'}
      </h1>
      <div className='flex gap-2'>
        <Button
          variant={mode === 'reply' ? 'default' : 'outline'}
          onClick={() => setMode('reply')}
        >
          댓글/답글
        </Button>
        <Button
          variant={mode === 'caption' ? 'default' : 'outline'}
          onClick={() => setMode('caption')}
        >
          캡션(택틱)
        </Button>
      </div>
    </div>
  );

  /* ======== 공통 옵션 UI ======== */
  const Options = (
    <div className="space-y-3 rounded-xl border border-[--border-subtle] bg-[--surface-1] p-4">
      <label className='text-sm font-medium'>문체 프롬프트</label>
      <Textarea
        className='min-h-[80px]'
        value={options.stylePrompt}
        onChange={e => setOptions({ ...options, stylePrompt: e.target.value })}
      />
      <div className='flex gap-2 items-center'>
        <label className='text-sm font-medium'>언어</label>
        <Select
          value={options.language}
          onValueChange={(v) => setOptions({ ...options, language: v as LanguageCode })}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ko">한국어</SelectItem>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="ja">日本語</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  /* ======== 댓글/답글 UI ======== */
  const ReplyUI = (
    <div className='space-y-6'>
      <Textarea
        className='min-h-[160px]'
        placeholder='인스타 댓글 원문을 그대로 붙여넣으세요'
        value={rawReply}
        onChange={e => setRawReply(e.target.value)}
      />

      {Options}

      <div className='flex gap-2'>
        <Button
          onClick={handleGenerateReplies}
          disabled={replyLoading || !rawReply.trim()}
        >
          {replyLoading ? '생성 중…' : <><span>답글 생성</span><CreditCost amount={1} /></>}
        </Button>
        <Button
          variant='outline'
          onClick={() => {
            setRawReply('');
            setReplyItems([]);
            setReplyErr(null);
            setOptions({
              stylePrompt:
                '부드러운 존댓말, 공감/위로 톤, 2~3문장, 이모티콘 0~1개, 해시태그/링크 금지',
              language: 'ko',
            });
          }}
        >
          초기화
        </Button>
      </div>

      {replyErr && <p className='text-sm text-red-600'>{replyErr}</p>}

      <div className='space-y-4'>
        {replyItems.map(it => (
          <ReplyCard key={it.id} it={it} />
        ))}
        {replyItems.length === 0 && !replyLoading && (
          <p className='text-sm text-muted-foreground'>
            생성된 답변이 없습니다. 댓글 원문을 붙여넣고 “답글 생성”을
            눌러주세요.
          </p>
        )}
      </div>
    </div>
  );

  /* ======== 캡션(택틱) UI ======== */
  const CaptionUI = (
    <div className='space-y-6'>
      <Textarea
        className='min-h-[160px]'
        placeholder='캡션의 기반이 될 스크립트(콘텐츠 원문)를 붙여넣으세요'
        value={rawCaption}
        onChange={e => setRawCaption(e.target.value)}
      />

      {Options}

      <div className='flex gap-2'>
        <Button
          onClick={handleGenerateCaption}
          disabled={captionLoading || !rawCaption.trim()}
        >
          {captionLoading ? '생성 중…' : <><span>캡션 생성</span><CreditCost amount={1} /></>}
        </Button>
        <Button
          variant='outline'
          onClick={() => {
            setRawCaption('');
            setCaptionText('');
            setCaptionErr(null);
            setOptions({
              stylePrompt:
                '부드러운 존댓말, 공감/위로 톤, 2~3문장, 이모티콘 0~2개, 해시태그/링크 금지',
              language: 'ko',
            });
          }}
        >
          초기화
        </Button>
        <Button
          className='hover:bg-[--surface-3] active:bg-[--accent-active]'
          onClick={() => {
            copyCaption();
            setCaptionCopied(true);
          }}
          disabled={!captionText}
        >
          {captionCopied ? '복사됨' : '캡션 복사'}
        </Button>
      </div>

      {captionErr && <p className='text-sm text-red-600'>{captionErr}</p>}

      {captionText ? (
        <div className='border rounded p-4 whitespace-pre-wrap leading-relaxed'>
          {captionText}
        </div>
      ) : (
        !captionLoading && (
          <p className='text-sm text-muted-foreground'>
            캡션이 없습니다. 스크립트를 붙여넣고 “캡션 생성”을 눌러주세요.
          </p>
        )
      )}
    </div>
  );

  return (
    <div className='w-full max-w-3xl mx-auto px-6 py-10 space-y-8'>
      <div>
        {TopBar}
      </div>
      <div className='space-y-6'>
        {mode === 'reply' ? ReplyUI : CaptionUI}
      </div>
    </div>
  );
};

export default InstagHelper;
