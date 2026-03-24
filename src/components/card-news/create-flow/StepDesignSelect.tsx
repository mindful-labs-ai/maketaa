'use client';

import { useRouter } from 'next/navigation';
import { useCreateStore } from '@/stores/card-news/useCreateStore';
import { Button } from '@/components/ui/button';

const DESIGN_TEMPLATES = [
  {
    id: 'longblack-editorial',
    name: '에디토리얼 다크',
    description: '깔끔한 다크 에디토리얼 스타일',
    preview: 'bg-[#2A2A2E]',
    accent: '#4A7AFF',
  },
  {
    id: 'warm-modern',
    name: '웜 모던',
    description: '따뜻한 톤의 모던 디자인',
    preview: 'bg-[#2A2A2E]',
    accent: '#E8A87C',
  },
];

const CANVAS_RATIOS = [
  { value: '1:1' as const, label: '1:1 정사각형' },
  { value: '4:5' as const, label: '4:5 인스타그램' },
  { value: '9:16' as const, label: '9:16 스토리' },
];

export default function StepDesignSelect() {
  const {
    designTemplateId,
    topic,
    purpose,
    setDesignTemplate,
    setStep,
    setIsGenerating,
    setGenerationProgress,
    setGenerationError,
    prevStep,
    nextStep,
  } = useCreateStore();

  const router = useRouter();

  const handleGenerate = async () => {
    if (!topic || !purpose) return;

    nextStep(); // move to 'generating'
    setIsGenerating(true);
    setGenerationProgress('카드 구조 생성 중...');
    setGenerationError(null);

    try {
      const res = await fetch('/api/card-news/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          purpose,
          template_id: designTemplateId || 'longblack-editorial',
          canvas_ratio: '1:1',
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '생성 실패');
      }

      setGenerationProgress('생성 완료! 에디터로 이동합니다...');
      const data = await res.json();

      // Navigate to editor
      router.push(`/card-news/editor/${data.id}`);
    } catch (err) {
      setGenerationError(err instanceof Error ? err.message : '생성에 실패했습니다.');
      setIsGenerating(false);
      setStep('design'); // go back
    }
  };

  return (
    <div>
      <h2 className='text-lg font-semibold mb-4'>3단계: 디자인 선택</h2>
      <p className='text-sm text-muted-foreground mb-6'>
        템플릿을 선택하고 생성을 시작하세요.
      </p>

      <div className='grid grid-cols-2 gap-4 mb-6'>
        {DESIGN_TEMPLATES.map((tmpl) => (
          <button
            key={tmpl.id}
            type='button'
            onClick={() => setDesignTemplate(tmpl.id)}
            className={`rounded-lg border p-4 transition-all text-left ${
              designTemplateId === tmpl.id
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/30'
            }`}
          >
            <div
              className={`w-full h-24 rounded-md mb-3 ${tmpl.preview} flex items-center justify-center`}
            >
              <div
                className='w-8 h-8 rounded-full'
                style={{ backgroundColor: tmpl.accent }}
              />
            </div>
            <p className='font-medium text-sm'>{tmpl.name}</p>
            <p className='text-xs text-muted-foreground mt-1'>{tmpl.description}</p>
          </button>
        ))}
      </div>

      <div className='flex justify-between mt-8'>
        <Button variant='outline' onClick={prevStep}>
          이전
        </Button>
        <Button onClick={handleGenerate} disabled={!designTemplateId}>
          생성하기
        </Button>
      </div>
    </div>
  );
}
