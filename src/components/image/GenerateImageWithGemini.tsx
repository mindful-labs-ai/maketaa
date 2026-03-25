'use client';

import { useMemo, useRef, useState } from 'react';
import { CreditCost } from '@/components/ui/credit-cost';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Upload,
  Loader2,
  Download,
  X,
  FileImage,
  Sparkles,
  Star,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { notify } from '@/lib/maker/utils';
import { reportUsage } from '@/lib/shared/usage';
import { creditFetch } from '@/lib/credits/creditFetch';

interface ImageAsset {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  dataUrl: string;
  base64: string;
  caption?: string;
  isPrimary?: boolean;
}

interface GeneratedImage {
  dataUrl: string;
  timestamp: Date;
}

const ratioOptions = [
  { value: '1:1', label: '1:1' },
  { value: '2:3', label: '2:3' },
  { value: '3:2', label: '3:2' },
  { value: '3:4', label: '3:4' },
  { value: '4:3', label: '4:3' },
  { value: '4:5', label: '4:5' },
  { value: '5:4', label: '5:4' },
  { value: '9:16', label: '9:16' },
  { value: '16:9', label: '16:9' },
  { value: '21:9', label: '21:9' },
];

export const GenerateImageWithGemini = () => {
  const [assets, setAssets] = useState<ImageAsset[]>([]);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedRatio, setSelectedRatio] = useState('1:1');
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [showRefSection, setShowRefSection] = useState(false);

  const primary = useMemo(
    () => assets.find(a => a.isPrimary) || assets[0],
    [assets]
  );
  const additions = useMemo(
    () => assets.filter(a => primary && a.id !== primary.id),
    [assets, primary]
  );

  const fileToBase64 = (
    file: File
  ): Promise<{ base64: string; dataUrl: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(',')[1] || '';
        resolve({ base64, dataUrl });
      };
      reader.onerror = () => reject(new Error('파일을 읽을 수 없습니다.'));
      reader.readAsDataURL(file);
    });
  };

  const addFiles = async (files: FileList | File[]) => {
    const list = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (list.length === 0) {
      setError('이미지 파일만 업로드 가능합니다.');
      return;
    }
    setError(null);

    const results = await Promise.all(
      list.map(async file => {
        const { base64, dataUrl } = await fileToBase64(file);
        return {
          id: crypto.randomUUID(),
          name: file.name,
          mimeType: file.type,
          size: file.size,
          dataUrl,
          base64,
          caption: '',
          isPrimary: false,
        } as ImageAsset;
      })
    );

    setAssets(prev => {
      const next = [...prev, ...results];
      if (!next.some(a => a.isPrimary) && next.length > 0) {
        next[0].isPrimary = true;
      }
      return [...next];
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const handleClickUpload = () => fileInputRef.current?.click();

  const removeAsset = (id: string) => {
    setAssets(prev => {
      const next = prev.filter(a => a.id !== id);
      if (!next.some(a => a.isPrimary) && next.length > 0) {
        next[0].isPrimary = true;
      }
      return next;
    });
  };

  const setPrimaryAsset = (id: string) => {
    setAssets(prev => prev.map(a => ({ ...a, isPrimary: a.id === id })));
  };

  const setCaption = (id: string, caption: string) => {
    setAssets(prev => prev.map(a => (a.id === id ? { ...a, caption } : a)));
  };

  const resetAll = () => {
    setAssets([]);
    setPrompt('');
    setError(null);
    setGeneratedImages([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const buildPayload = () => {
    if (!primary) throw new Error('최소 1장의 참조 이미지가 필요합니다.');
    return {
      prompt,
      ratio: selectedRatio,
      resolution: 480,
      imageBase64: primary.base64,
      imageMimeType: primary.mimeType,
      additions: additions.map(a => ({
        caption: a.caption || '',
        inlineData: { mimeType: a.mimeType, data: a.base64 },
      })),
    };
  };

  const generateWithGemini = async () => {
    let tokenUsage;
    try {
      if (!prompt.trim()) {
        setError('프롬프트를 입력하세요.');
        return;
      }
      if (!primary) {
        setError('최소 1장의 참조 이미지가 필요합니다.');
        return;
      }
      setIsGenerating(true);
      setError(null);

      const payload = buildPayload();
      const res = await creditFetch('/api/image-gen/textToimg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('이미지 생성 실패');
      const data = await res.json();
      tokenUsage = data.tokenUsage;

      if (!data.success) {
        notify('이미지 생성에 실패하셨습니다. 프롬프트를 더 다듬어주세요.');
        return;
      }

      if (data.generatedImage) {
        const imageDataUrl = `data:image/png;base64,${data.generatedImage}`;
        setGeneratedImages(prev => [
          ...prev,
          { dataUrl: imageDataUrl, timestamp: new Date() },
        ]);
        if (data.historyId) {
          console.log('✅ Image saved to history:', data.historyId);
        }
      }
    } catch (err: any) {
      setError(err?.message || '알 수 없는 오류');
    } finally {
      setIsGenerating(false);
      await reportUsage('imageGemini', tokenUsage, 1);
    }
  };

  const generateImageToText = async () => {
    let tokenUsage;
    try {
      if (!prompt.trim()) {
        setError('프롬프트를 입력하세요.');
        return;
      }
      setIsGenerating(true);
      setError(null);

      const payload = { prompt, ratio: selectedRatio, resolution: 480 };
      const res = await creditFetch('/api/image-gen/textToimg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('이미지 생성 실패');
      const data = await res.json();
      tokenUsage = data.tokenUsage;

      if (!data.success) {
        notify('이미지 생성에 실패하셨습니다. 프롬프트를 더 다듬어주세요.');
        return;
      }

      if (data.generatedImage) {
        const imageDataUrl = `data:image/png;base64,${data.generatedImage}`;
        setGeneratedImages(prev => [
          ...prev,
          { dataUrl: imageDataUrl, timestamp: new Date() },
        ]);
        if (data.historyId) {
          console.log('✅ Image saved to history:', data.historyId);
        }
      }
    } catch (err: any) {
      setError(err?.message || '알 수 없는 오류');
    } finally {
      setIsGenerating(false);
      await reportUsage('imageGemini', tokenUsage, 1);
    }
  };

  const downloadImage = (dataUrl: string, index: number) => {
    const now = new Date();
    const pad2 = (n: number) => String(n).padStart(2, '0');
    const dateStr = `${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}`;
    const timeStr = `${pad2(now.getHours())}${pad2(now.getMinutes())}`;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${dateStr}-${timeStr}-image${pad2(index + 1)}.png`;
    a.click();
  };

  return (
    <div className='w-full max-w-3xl mx-auto px-6 py-10 space-y-8'>
      {/* Header */}
      <div>
        <h2 className='text-2xl font-bold text-[--text-primary]'>AI 이미지 생성</h2>
        <p className='text-sm text-[--text-secondary] mt-1'>
          프롬프트를 입력하면 AI가 고품질 이미지를 만들어드립니다
        </p>
      </div>

      {/* Prompt - Hero element */}
      <div className='space-y-2'>
        <Textarea
          placeholder='만들고 싶은 이미지를 설명해주세요...'
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          style={{ backgroundColor: 'var(--surface-3)' }}
          className='min-h-[160px] border-[--border-default] text-[--text-primary] placeholder:text-[--text-tertiary] focus:border-[--accent] focus:ring-[--accent]/20 text-base resize-none rounded-xl p-4'
        />
      </div>

      {/* Settings Row - Ratio as pill buttons */}
      <div className='space-y-2'>
        <label className='text-xs font-medium text-[--text-secondary] uppercase tracking-wider'>화면 비율</label>
        <div className='flex flex-wrap gap-1.5'>
          {ratioOptions.map(opt => (
            <button
              key={opt.value}
              type='button'
              onClick={() => setSelectedRatio(opt.value)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all duration-150 ${
                selectedRatio === opt.value
                  ? 'bg-primary text-primary-foreground border-primary shadow-[0_0_0_3px_rgba(124,92,252,0.15)]'
                  : 'bg-[--surface-2] border-[--border-subtle] text-[--text-secondary] hover:border-[--accent] hover:text-[--text-primary]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Collapsible Reference Image Section */}
      <div className='rounded-xl border border-[--border-subtle] overflow-hidden'>
        <button
          type='button'
          onClick={() => setShowRefSection(!showRefSection)}
          className='w-full flex items-center justify-between px-4 py-3 bg-[--surface-1] hover:bg-[--surface-2] transition-colors'
        >
          <div className='flex items-center gap-2'>
            <FileImage className='w-4 h-4 text-[--text-secondary]' />
            <span className='text-sm font-medium text-[--text-primary]'>
              참조 이미지
            </span>
            {assets.length > 0 && (
              <span className='text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full'>
                {assets.length}장
              </span>
            )}
          </div>
          {showRefSection ? (
            <ChevronUp className='w-4 h-4 text-[--text-secondary]' />
          ) : (
            <ChevronDown className='w-4 h-4 text-[--text-secondary]' />
          )}
        </button>

        {showRefSection && (
          <div className='p-4 bg-[--surface-1] border-t border-[--border-subtle] space-y-4'>
            {/* Drop zone */}
            <div
              className='border-2 border-dashed border-[--border-default] rounded-xl p-6 text-center hover:border-[--accent]/50 transition-colors'
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type='file'
                accept='image/*'
                multiple
                className='hidden'
                onChange={e => e.target.files && addFiles(e.target.files)}
              />
              <FileImage className='mx-auto h-8 w-8 text-[--text-tertiary] mb-2' />
              <p className='text-sm text-[--text-secondary] mb-3'>
                이미지를 드래그하거나 클릭하여 업로드 (여러 장 가능)
              </p>
              <Button
                variant='outline'
                size='sm'
                onClick={handleClickUpload}
                className='border-[--border-default]'
              >
                <Upload className='mr-2 h-4 w-4' /> 이미지 선택
              </Button>
            </div>

            {/* Uploaded assets grid */}
            {assets.length > 0 && (
              <div className='grid grid-cols-3 gap-3'>
                {assets.map(a => (
                  <div
                    key={a.id}
                    className={`rounded-lg border p-2 space-y-2 relative ${
                      a.isPrimary
                        ? 'border-[--accent] shadow-[0_0_8px_rgba(124,92,252,0.2)]'
                        : 'border-[--border-subtle]'
                    }`}
                  >
                    <img
                      src={a.dataUrl}
                      alt={a.name}
                      className='w-full rounded aspect-square object-cover'
                    />
                    <div className='flex items-center justify-between'>
                      <button
                        type='button'
                        onClick={() => setPrimaryAsset(a.id)}
                        className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors ${
                          a.isPrimary
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-[--surface-2] text-[--text-secondary] hover:bg-[--surface-3]'
                        }`}
                      >
                        <Star className='h-3 w-3' /> Primary
                      </button>
                      <button
                        type='button'
                        onClick={() => removeAsset(a.id)}
                        className='p-1 rounded-md text-[--text-secondary] hover:text-[--error] hover:bg-[--surface-3] transition-colors'
                      >
                        <X className='h-3.5 w-3.5' />
                      </button>
                    </div>
                    <Input
                      placeholder='이미지 설명(선택)'
                      value={a.caption || ''}
                      onChange={e => setCaption(a.id, e.target.value)}
                      className='text-xs h-7 bg-[--surface-2] border-[--border-subtle]'
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Generate Button */}
      <Button
        className='w-full h-12 text-base font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80 shadow-[0_0_20px_rgba(124,92,252,0.25)] hover:shadow-[0_0_28px_rgba(124,92,252,0.45)] transition-all'
        onClick={() => {
          if (primary) {
            generateWithGemini();
          } else {
            generateImageToText();
          }
        }}
        disabled={isGenerating || !prompt.trim()}
      >
        {isGenerating ? (
          <>
            <Loader2 className='mr-2 h-5 w-5 animate-spin' /> 생성 중...
          </>
        ) : (
          <>
            <Sparkles className='mr-2 h-5 w-5' /> Gemini로 이미지 생성{' '}
            <CreditCost amount={5} />
          </>
        )}
      </Button>

      {/* Error */}
      {error && (
        <div className='bg-[--error]/10 border border-[--error]/30 text-[--error] px-4 py-3 rounded-xl text-sm'>
          {error}
        </div>
      )}

      {/* Results */}
      {generatedImages.length > 0 && (
        <div className='space-y-4 pt-4 border-t border-[--border-subtle]'>
          <div className='flex justify-between items-center'>
            <h3 className='text-lg font-semibold text-[--text-primary]'>
              생성된 이미지 ({generatedImages.length})
            </h3>
            <button
              onClick={resetAll}
              className='text-sm text-[--text-secondary] hover:text-[--text-primary] flex items-center gap-1 transition-colors'
            >
              <X className='h-3.5 w-3.5' /> 전체 초기화
            </button>
          </div>

          <div className='grid grid-cols-2 gap-4'>
            {generatedImages
              .map((img, idx) => (
                <div key={idx} className='relative group rounded-xl overflow-hidden border border-[--border-subtle]'>
                  <img
                    src={img.dataUrl}
                    alt={`Generated ${idx + 1}`}
                    className='w-full'
                  />
                  <div className='absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center'>
                    <Button
                      variant='secondary'
                      size='sm'
                      onClick={() => downloadImage(img.dataUrl, idx)}
                      className='bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20'
                    >
                      <Download className='mr-2 h-4 w-4' /> 다운로드
                    </Button>
                  </div>
                </div>
              ))
              .reverse()}
          </div>
        </div>
      )}
    </div>
  );
};
