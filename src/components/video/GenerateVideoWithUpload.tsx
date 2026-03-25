/* eslint-disable @next/next/no-img-element */
'use client';

import { Button } from '@/components/ui/button';
import { CreditCost } from '@/components/ui/credit-cost';
import { Textarea } from '@/components/ui/textarea';
import {
  Download,
  FileImage,
  Loader2,
  Sparkles,
  Upload,
  X,
  ChevronDown,
  ChevronUp,
  Play,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  SeeDanceImageToVideoResponse,
  TaskResponse,
} from '@/app/api/seedance/clip-gen/[id]/route';
import { notify } from '@/lib/gif/utils';
import { downloadAndSaveVideoToHistory } from '@/lib/shared/asset-history-client';
import { reportUsage } from '@/lib/shared/usage';
import { creditFetch } from '@/lib/credits/creditFetch';

interface UploadedImage {
  name: string;
  base64: string;
  dataUrl: string;
  mimeType: string;
}

interface CalledVideoInfo {
  aiType: string;
  id: string;
  url: string;
}

type Ratio = '16:9' | '4:3' | '1:1' | '3:4' | '9:16';

const ratioOptions: { value: Ratio; label: string }[] = [
  { value: '16:9', label: '16:9' },
  { value: '4:3', label: '4:3' },
  { value: '1:1', label: '1:1' },
  { value: '3:4', label: '3:4' },
  { value: '9:16', label: '9:16' },
];

const durationOptions = [
  { value: '5' as const, label: '5초' },
  { value: '10' as const, label: '10초' },
];

export const GenerateVideoWithUpload = () => {
  const [uploadedFirstFrame, setUploadedFirstFrame] =
    useState<UploadedImage | null>(null);
  const [uploadedLastFrame, setUploadedLastFrame] =
    useState<UploadedImage | null>(null);
  const [aiType] = useState<'SEE_DANCE'>('SEE_DANCE');
  const [generatedClips, setGeneratedClips] = useState<CalledVideoInfo[]>([]);
  const [clipId, setClipId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState<'5' | '10'>('5');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActiveFirst, setDragActiveFirst] = useState(false);
  const [dragActiveLast, setDragActiveLast] = useState(false);
  const firstFrameInputRef = useRef<HTMLInputElement>(null);
  const lastFrameInputRef = useRef<HTMLInputElement>(null);
  const [liteModel, setLiteModel] = useState(false);
  const [ratio, setRatio] = useState<Ratio>('16:9');
  const [showEndFrame, setShowEndFrame] = useState(false);

  const [isPolling, setIsPolling] = useState(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastStatusRef = useRef<TaskResponse['status'] | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const savedToHistoryRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const fileToBase64 = (file: File): Promise<UploadedImage> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(',')[1];
        resolve({ name: file.name, base64, dataUrl, mimeType: file.type });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 업로드 가능합니다.');
      return;
    }
    try {
      const convertedImage = await fileToBase64(file);
      setUploadedFirstFrame(convertedImage);
      setError(null);
    } catch {
      setError('이미지 변환 실패');
    }
  };

  const processLastFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 업로드 가능합니다.');
      return;
    }
    try {
      const convertedImage = await fileToBase64(file);
      setUploadedLastFrame(convertedImage);
      setError(null);
    } catch {
      setError('이미지 변환 실패');
    }
  };

  const handleDragFirst = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActiveFirst(true);
    else if (e.type === 'dragleave') setDragActiveFirst(false);
  };

  const handleDropFirst = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActiveFirst(false);
    if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]);
  };

  const handleDragLast = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActiveLast(true);
    else if (e.type === 'dragleave') setDragActiveLast(false);
  };

  const handleDropLast = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActiveLast(false);
    if (e.dataTransfer.files?.[0]) processLastFile(e.dataTransfer.files[0]);
  };

  const stopPolling = () => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    pollTimerRef.current = null;
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = null;
    lastStatusRef.current = null;
    setIsPolling(false);
  };

  const resetSavedHistory = () => {
    savedToHistoryRef.current.clear();
  };

  const checkSeedanceOnce = async (id: string) => {
    try {
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();

      const response = await fetch(`/api/seedance/${id}`, {
        method: 'GET',
        cache: 'no-store',
        signal: abortRef.current.signal,
      });

      if (!response.ok) throw new Error(`Status ${response.status}`);

      const jsonData = (await response.json()) as TaskResponse;
      const status = jsonData.status;

      if (status !== lastStatusRef.current) {
        if (status === 'queued') notify('요청 대기 중 입니다.');
        if (status === 'running') notify('클립 생성 중 입니다.');
        lastStatusRef.current = status;
      }

      if (status === 'succeeded') {
        const videoUrl = jsonData.content?.video_url;
        if (!videoUrl) throw new Error('클립 생성 실패');

        if (!savedToHistoryRef.current.has(jsonData.id)) {
          setGeneratedClips(prev => [
            ...prev,
            { aiType: 'SEE_DANCE', id: jsonData.id, url: videoUrl },
          ]);

          const tokenUsage = jsonData.usage?.total_tokens;
          await reportUsage('clipSeedance', tokenUsage, 1);

          downloadAndSaveVideoToHistory(prompt, videoUrl, {
            service: 'seedance',
            duration,
            ratio,
            tokenUsage,
            hasLastFrame: !!uploadedLastFrame,
            liteModel,
          }).catch(err => {
            console.error('Failed to save video to history:', err);
          });

          savedToHistoryRef.current.add(jsonData.id);
          notify('완료! 클립을 불러왔습니다.');
        }

        stopPolling();
        return 'done';
      }

      if (status === 'failed' || status === 'canceled') {
        setError(`AI Error : ${jsonData.error ?? '알 수 없는 오류'}`);
        stopPolling();
        return 'error';
      }

      return 'pending';
    } catch (e) {
      setError(e instanceof Error ? e.message : '알 수 없는 오류');
      stopPolling();
      return 'error';
    }
  };

  const startPolling = (id: string) => {
    if (!id) {
      setError('먼저 생성 버튼으로 클립을 만들고 나서 불러오기를 눌러주세요.');
      return;
    }
    if (isPolling) return;

    resetSavedHistory();
    setIsPolling(true);
    checkSeedanceOnce(id);

    pollTimerRef.current = setInterval(() => {
      checkSeedanceOnce(id);
    }, 5000);
  };

  const generateWithSeedance = async () => {
    if (!uploadedFirstFrame || !prompt.trim()) {
      setError('이미지와 프롬프트를 모두 입력해주세요.');
      return;
    }

    setIsGenerating(true);
    setError(null);

    const body = uploadedLastFrame
      ? {
          prompt,
          baseImage: uploadedFirstFrame.dataUrl,
          lastImage: uploadedLastFrame.dataUrl,
          resolution: 720,
          ratio,
          liteModel,
        }
      : {
          prompt,
          baseImage: uploadedFirstFrame.dataUrl,
          resolution: 720,
          ratio,
          liteModel,
        };

    try {
      const response = await creditFetch('/api/seedance/clip-gen/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error('이미지 생성 실패');

      const data = (await response.json()) as SeeDanceImageToVideoResponse;
      setClipId(data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadVideo = (url: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.click();
  };

  /* ── Compact frame upload card ── */
  const FrameUpload = ({
    label,
    image,
    onClear,
    inputRef,
    onFileChange,
    dragActive,
    onDrag,
    onDrop,
  }: {
    label: string;
    image: UploadedImage | null;
    onClear: () => void;
    inputRef: React.RefObject<HTMLInputElement | null>;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    dragActive: boolean;
    onDrag: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
  }) => (
    <div className='flex-1 min-w-0'>
      <label className='text-xs font-medium text-[--text-secondary] mb-2 block'>
        {label}
      </label>
      {!image ? (
        <div
          className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors cursor-pointer ${
            dragActive
              ? 'border-[--accent] bg-[--accent]/5'
              : 'border-[--border-default] hover:border-[--accent]/50'
          }`}
          onDragEnter={onDrag}
          onDragLeave={onDrag}
          onDragOver={onDrag}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type='file'
            accept='image/*'
            onChange={onFileChange}
            className='hidden'
          />
          <Upload className='mx-auto h-6 w-6 text-[--text-tertiary] mb-1' />
          <p className='text-xs text-[--text-secondary]'>
            클릭 또는 드래그
          </p>
        </div>
      ) : (
        <div className='relative rounded-xl overflow-hidden border border-[--border-subtle]'>
          <img
            src={image.dataUrl}
            alt={label}
            className='w-full aspect-video object-cover'
          />
          <button
            type='button'
            onClick={onClear}
            className='absolute top-1.5 right-1.5 p-1 rounded-md bg-black/60 text-white hover:bg-black/80 transition-colors'
          >
            <X className='h-3.5 w-3.5' />
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className='w-full max-w-3xl mx-auto px-6 py-10 space-y-8'>
      {/* Header */}
      <div>
        <h2 className='text-2xl font-bold text-[--text-primary]'>AI 비디오 생성</h2>
        <p className='text-sm text-[--text-secondary] mt-1'>
          이미지에서 AI 비디오를 생성하세요
        </p>
      </div>

      {/* Prompt - Hero element */}
      <div className='space-y-2'>
        <Textarea
          placeholder='영상으로 만들 동작이나 장면을 설명해주세요...'
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          style={{ backgroundColor: 'var(--surface-3)' }}
          className='min-h-[140px] border-[--border-default] text-[--text-primary] placeholder:text-[--text-tertiary] focus:border-[--accent] focus:ring-[--accent]/20 text-base resize-none rounded-xl p-4'
        />
      </div>

      {/* Settings Row */}
      <div className='space-y-5'>
        {/* Ratio */}
        <div className='space-y-2'>
          <label className='text-xs font-medium text-[--text-secondary] uppercase tracking-wider'>화면 비율</label>
          <div className='flex flex-wrap gap-1.5'>
            {ratioOptions.map(opt => (
              <button
                key={opt.value}
                type='button'
                onClick={() => setRatio(opt.value)}
                className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all duration-150 ${
                  ratio === opt.value
                    ? 'bg-primary text-primary-foreground border-primary shadow-[0_0_0_3px_rgba(124,92,252,0.15)]'
                    : 'bg-[--surface-2] border-[--border-subtle] text-[--text-secondary] hover:border-[--accent] hover:text-[--text-primary]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Duration + Model + Lite in one row */}
        <div className='grid grid-cols-3 gap-4'>
          {/* Duration */}
          <div className='space-y-2'>
            <label className='text-xs font-medium text-[--text-secondary] uppercase tracking-wider'>영상 길이</label>
            <div className='flex rounded-lg overflow-hidden border border-[--border-subtle]'>
              {durationOptions.map(opt => (
                <button
                  key={opt.value}
                  type='button'
                  onClick={() => setDuration(opt.value)}
                  className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                    duration === opt.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-[--surface-1] text-[--text-secondary] hover:bg-[--surface-2]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* AI Model */}
          <div className='space-y-2'>
            <label className='text-xs font-medium text-[--text-secondary] uppercase tracking-wider'>생성 AI</label>
            <div className='flex items-center gap-2 px-3 py-2 rounded-lg border border-[--border-subtle] bg-[--surface-1]'>
              <div className='w-2 h-2 rounded-full bg-[--success]' />
              <span className='text-sm text-[--text-primary]'>SeeDance</span>
            </div>
          </div>

          {/* Lite Model Toggle */}
          <div className='space-y-2'>
            <label className='text-xs font-medium text-[--text-secondary] uppercase tracking-wider'>모델</label>
            <div className='flex rounded-lg overflow-hidden border border-[--border-subtle]'>
              <button
                type='button'
                onClick={() => setLiteModel(false)}
                className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                  !liteModel
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-[--surface-1] text-[--text-secondary] hover:bg-[--surface-2]'
                }`}
              >
                Pro
              </button>
              <button
                type='button'
                onClick={() => setLiteModel(true)}
                className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                  liteModel
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-[--surface-1] text-[--text-secondary] hover:bg-[--surface-2]'
                }`}
              >
                Lite
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Frame Uploads */}
      <div className='rounded-xl border border-[--border-subtle] bg-[--surface-1] p-4 space-y-4'>
        <div className='flex items-center gap-4'>
          <FrameUpload
            label='스타트 프레임 (필수)'
            image={uploadedFirstFrame}
            onClear={() => setUploadedFirstFrame(null)}
            inputRef={firstFrameInputRef}
            onFileChange={e => e.target.files?.[0] && processFile(e.target.files[0])}
            dragActive={dragActiveFirst}
            onDrag={handleDragFirst}
            onDrop={handleDropFirst}
          />

          {showEndFrame ? (
            <FrameUpload
              label='엔드 프레임 (선택)'
              image={uploadedLastFrame}
              onClear={() => setUploadedLastFrame(null)}
              inputRef={lastFrameInputRef}
              onFileChange={e =>
                e.target.files?.[0] && processLastFile(e.target.files[0])
              }
              dragActive={dragActiveLast}
              onDrag={handleDragLast}
              onDrop={handleDropLast}
            />
          ) : (
            <div className='flex-1 min-w-0'>
              <label className='text-xs font-medium text-[--text-secondary] mb-2 block'>
                엔드 프레임 (선택)
              </label>
              <button
                type='button'
                onClick={() => setShowEndFrame(true)}
                className='w-full border-2 border-dashed border-[--border-default] rounded-xl p-4 text-center hover:border-[--accent]/50 transition-colors'
              >
                <span className='text-xs text-[--text-tertiary]'>+ 엔드 프레임 추가</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className='space-y-3'>
        <Button
          onClick={generateWithSeedance}
          disabled={!uploadedFirstFrame || !prompt.trim() || isGenerating}
          className='w-full h-12 text-base font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80 shadow-[0_0_20px_rgba(124,92,252,0.25)] hover:shadow-[0_0_28px_rgba(124,92,252,0.45)] transition-all'
        >
          {isGenerating ? (
            <>
              <Loader2 className='mr-2 h-5 w-5 animate-spin' /> 생성 중...
            </>
          ) : (
            <>
              <Sparkles className='mr-2 h-5 w-5' />
              {`${aiType} 생성${liteModel ? ' / Lite' : ''}`}
              <CreditCost amount={liteModel ? 12 : 20} />
            </>
          )}
        </Button>

        <Button
          onClick={() => clipId && startPolling(clipId)}
          disabled={!clipId || isPolling}
          variant='outline'
          className='w-full h-12 text-base font-semibold rounded-xl border-[--border-default] hover:bg-[--surface-2] transition-all'
        >
          {isPolling ? (
            <>
              <Loader2 className='mr-2 h-5 w-5 animate-spin' /> 자동 확인 중 (5초
              간격)
            </>
          ) : (
            <>
              <Play className='mr-2 h-5 w-5' /> 영상 읽어오기
            </>
          )}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className='bg-[--error]/10 border border-[--error]/30 text-[--error] px-4 py-3 rounded-xl text-sm'>
          {error}
        </div>
      )}

      {/* Generated Videos */}
      {generatedClips.length > 0 && (
        <div className='space-y-4 pt-4 border-t border-[--border-subtle]'>
          <h3 className='text-lg font-semibold text-[--text-primary]'>
            생성된 비디오 ({generatedClips.length})
          </h3>

          <div className='grid grid-cols-2 gap-4'>
            {generatedClips
              .slice()
              .reverse()
              .map((clip, reversedIndex) => (
                <div
                  className='rounded-xl overflow-hidden border border-[--border-subtle]'
                  key={clip.id + reversedIndex}
                >
                  <video
                    src={clip.url}
                    controls
                    preload='metadata'
                    playsInline
                    className='w-full'
                  />
                  <div className='p-2 flex justify-center bg-[--surface-1]'>
                    <button
                      onClick={() => downloadVideo(clip.url)}
                      className='flex items-center gap-1.5 text-sm text-[--text-secondary] hover:text-[--text-primary] transition-colors px-3 py-1.5 rounded-lg hover:bg-[--surface-2]'
                    >
                      <Download className='h-4 w-4' /> 다운로드
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
