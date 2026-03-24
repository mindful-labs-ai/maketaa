/**
 * Zustand Store for Create Wizard Flow
 * Ported from canvas_editor - in-memory only, no persistence
 */

import { create } from 'zustand';
import type {
  CreateStep,
  TopicSelection,
  PurposeConfig,
  TopicSuggestion,
} from '@/lib/card-news/types';

interface CreateStoreState {
  currentStep: CreateStep;
  topic: TopicSelection | null;
  purpose: PurposeConfig | null;
  designTemplateId: string | null;
  topicSuggestions: TopicSuggestion[];
  isLoadingSuggestions: boolean;
  isGenerating: boolean;
  generationProgress: string;
  generationError: string | null;

  setStep: (step: CreateStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  selectTopic: (topic: TopicSelection) => void;
  setPurpose: (purpose: PurposeConfig) => void;
  setDesignTemplate: (templateId: string) => void;
  setTopicSuggestions: (suggestions: TopicSuggestion[]) => void;
  setIsLoadingSuggestions: (loading: boolean) => void;
  setIsGenerating: (generating: boolean) => void;
  setGenerationProgress: (message: string) => void;
  setGenerationError: (error: string | null) => void;
  reset: () => void;
}

const STEP_ORDER: CreateStep[] = ['topic', 'purpose', 'design', 'generating'];

const initialState = {
  currentStep: 'topic' as CreateStep,
  topic: null as TopicSelection | null,
  purpose: null as PurposeConfig | null,
  designTemplateId: null as string | null,
  topicSuggestions: [] as TopicSuggestion[],
  isLoadingSuggestions: false,
  isGenerating: false,
  generationProgress: '',
  generationError: null as string | null,
};

export const useCreateStore = create<CreateStoreState>((set, get) => ({
  ...initialState,

  setStep: (step) => set({ currentStep: step }),

  nextStep: () => {
    const { currentStep } = get();
    const idx = STEP_ORDER.indexOf(currentStep);
    if (idx < STEP_ORDER.length - 1) {
      set({ currentStep: STEP_ORDER[idx + 1] });
    }
  },

  prevStep: () => {
    const { currentStep } = get();
    const idx = STEP_ORDER.indexOf(currentStep);
    if (idx > 0) {
      set({ currentStep: STEP_ORDER[idx - 1] });
    }
  },

  selectTopic: (topic) => set({ topic }),
  setPurpose: (purpose) => set({ purpose }),
  setDesignTemplate: (templateId) => set({ designTemplateId: templateId }),
  setTopicSuggestions: (suggestions) => set({ topicSuggestions: suggestions }),
  setIsLoadingSuggestions: (loading) => set({ isLoadingSuggestions: loading }),
  setIsGenerating: (generating) => set({ isGenerating: generating }),
  setGenerationProgress: (message) => set({ generationProgress: message }),
  setGenerationError: (error) => set({ generationError: error }),
  reset: () => set(initialState),
}));
