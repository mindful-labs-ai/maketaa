/**
 * Zustand Store for Create Wizard Flow State Management
 * Manages the 3-step card news creation wizard:
 *   Step 1 (topic) → Step 2 (purpose) → Step 3 (design) → generating
 */

import { create } from 'zustand';
import type {
  CreateStep,
  TopicSelection,
  PurposeConfig,
  TopicSuggestion,
} from '@/types';

// ============================================================================
// Store State Interface
// ============================================================================

interface CreateStoreState {
  // State
  currentStep: CreateStep;
  topic: TopicSelection | null;
  purpose: PurposeConfig | null;
  designTemplateId: string | null;

  // Topic suggestions from AI
  topicSuggestions: TopicSuggestion[];
  isLoadingSuggestions: boolean;

  // Generation state
  isGenerating: boolean;
  generationProgress: string; // progress message
  generationError: string | null;

  // Actions
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

// ============================================================================
// Step Order
// ============================================================================

const STEP_ORDER: CreateStep[] = ['topic', 'purpose', 'design', 'generating'];

// ============================================================================
// Store Creation
// ============================================================================

const initialState = {
  currentStep: 'topic' as CreateStep,
  topic: null,
  purpose: null,
  designTemplateId: null,
  topicSuggestions: [] as TopicSuggestion[],
  isLoadingSuggestions: false,
  isGenerating: false,
  generationProgress: '',
  generationError: null,
};

export const useCreateStore = create<CreateStoreState>((set, get) => ({
  ...initialState,

  // =========================================================================
  // Step Navigation
  // =========================================================================

  setStep: (step: CreateStep) => {
    set({ currentStep: step });
  },

  nextStep: () => {
    const { currentStep } = get();
    const currentIndex = STEP_ORDER.indexOf(currentStep);
    if (currentIndex < STEP_ORDER.length - 1) {
      set({ currentStep: STEP_ORDER[currentIndex + 1] });
    }
  },

  prevStep: () => {
    const { currentStep } = get();
    const currentIndex = STEP_ORDER.indexOf(currentStep);
    if (currentIndex > 0) {
      set({ currentStep: STEP_ORDER[currentIndex - 1] });
    }
  },

  // =========================================================================
  // Wizard Data
  // =========================================================================

  selectTopic: (topic: TopicSelection) => {
    set({ topic });
  },

  setPurpose: (purpose: PurposeConfig) => {
    set({ purpose });
  },

  setDesignTemplate: (templateId: string) => {
    set({ designTemplateId: templateId });
  },

  // =========================================================================
  // Topic Suggestions
  // =========================================================================

  setTopicSuggestions: (suggestions: TopicSuggestion[]) => {
    set({ topicSuggestions: suggestions });
  },

  setIsLoadingSuggestions: (loading: boolean) => {
    set({ isLoadingSuggestions: loading });
  },

  // =========================================================================
  // Generation State
  // =========================================================================

  setIsGenerating: (generating: boolean) => {
    set({ isGenerating: generating });
  },

  setGenerationProgress: (message: string) => {
    set({ generationProgress: message });
  },

  setGenerationError: (error: string | null) => {
    set({ generationError: error });
  },

  // =========================================================================
  // Reset
  // =========================================================================

  reset: () => {
    set(initialState);
  },
}));
