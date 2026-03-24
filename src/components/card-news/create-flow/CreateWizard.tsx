'use client';

import { useCreateStore } from '@/stores/card-news/useCreateStore';
import StepTopicSelect from './StepTopicSelect';
import StepPurpose from './StepPurpose';
import StepDesignSelect from './StepDesignSelect';
import GeneratingScreen from './GeneratingScreen';

export default function CreateWizard() {
  const currentStep = useCreateStore((s) => s.currentStep);

  return (
    <div>
      <div className='mb-8'>
        <h1 className='text-2xl font-bold mb-2'>카드뉴스 만들기</h1>
        <div className='flex gap-2'>
          {['topic', 'purpose', 'design'].map((step, i) => (
            <div
              key={step}
              className={`h-1 flex-1 rounded-full ${
                ['topic', 'purpose', 'design', 'generating'].indexOf(currentStep) >= i
                  ? 'bg-primary'
                  : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </div>

      {currentStep === 'topic' && <StepTopicSelect />}
      {currentStep === 'purpose' && <StepPurpose />}
      {currentStep === 'design' && <StepDesignSelect />}
      {currentStep === 'generating' && <GeneratingScreen />}
    </div>
  );
}
