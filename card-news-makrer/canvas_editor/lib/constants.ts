/**
 * Application Constants
 */

// ============================================================================
// Canvas & Rendering
// ============================================================================

export const CANVAS_CONFIG = {
  WIDTH: 1080,
  HEIGHT: 1080,
  BACKGROUND_COLOR: '#F0F4F8',
  BORDER_COLOR: '#E5E7EB',
};

// ============================================================================
// Canvas Aspect Ratios
// ============================================================================

export type CanvasRatio = '1:1' | '4:5' | '9:16';

export const CANVAS_RATIOS: Record<CanvasRatio, { width: number; height: number; label: string; aspectRatio: string }> = {
  '1:1':  { width: 1080, height: 1080, label: '1:1 정사각형',      aspectRatio: '1 / 1' },
  '4:5':  { width: 1080, height: 1350, label: '4:5 인스타그램',    aspectRatio: '4 / 5' },
  '9:16': { width: 1080, height: 1920, label: '9:16 스토리',       aspectRatio: '9 / 16' },
};

// ============================================================================
// Text Constraints
// ============================================================================

export const TEXT_LIMITS = {
  headline: 30,       // 15 → 30으로 완화
  body: 150,          // 50 → 150으로 완화
  sub_text: 100,
  description: 300,   // 새 필드
  quote: 200,         // 새 필드
  bullet_point: 100,  // 각 항목
};

// ============================================================================
// Card Roles
// ============================================================================

export const CARD_ROLES = {
  cover: '표지',
  empathy: '공감',
  cause: '원인',
  insight: '인사이트',
  solution: '해결법',
  tip: '팁',
  closing: '마무리',
  source: '출처',
  cta: 'CTA',
} as const;

// ============================================================================
// Layout Types
// ============================================================================

export const LAYOUT_TYPES = [
  'center',
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
  'split',
] as const;

// ============================================================================
// Background Types
// ============================================================================

export const BACKGROUND_TYPES = [
  'image',
  'gradient',
  'solid',
] as const;

// ============================================================================
// Status Values
// ============================================================================

export const CARD_STATUS = {
  draft: '작성중',
  review: '검토중',
  approved: '승인됨',
  published: '발행됨',
} as const;

// ============================================================================
// Platform Names
// ============================================================================

export const PLATFORMS = {
  instagram: 'Instagram',
  threads: 'Threads',
} as const;

// ============================================================================
// Debounce Delays (ms)
// ============================================================================

export const DEBOUNCE_DELAYS = {
  autoSave: 1000,
  textInput: 300,
  resize: 300,
  search: 500,
} as const;

// ============================================================================
// Animation Durations (ms)
// ============================================================================

export const ANIMATION_DURATIONS = {
  toast: 3000,
  modal: 200,
  fadeIn: 300,
  fadeOut: 300,
} as const;

// ============================================================================
// API Timeouts (ms)
// ============================================================================

export const API_TIMEOUTS = {
  default: 10000,
  upload: 30000,
  publish: 15000,
} as const;

// ============================================================================
// Error Messages (Korean)
// ============================================================================

export const ERROR_MESSAGES = {
  loadFailed: '카드를 불러올 수 없습니다. 다시 시도해주세요.',
  saveFailed: '저장에 실패했습니다. 다시 시도해주세요.',
  reorderFailed: '순서 변경에 실패했습니다.',
  approveFailed: '승인에 실패했습니다.',
  rejectFailed: '반려에 실패했습니다.',
  imageFailed: '배경 이미지를 불러올 수 없습니다.',
  authFailed: '인증이 필요합니다.',
  notFound: '요청한 항목을 찾을 수 없습니다.',
  textTooLong: '최대 글자수를 초과했습니다.',
  invalidInput: '유효하지 않은 입력입니다.',
} as const;

// ============================================================================
// Success Messages (Korean)
// ============================================================================

export const SUCCESS_MESSAGES = {
  cardLoaded: '카드가 로드되었습니다.',
  saved: '저장되었습니다.',
  reordered: '카드 순서가 변경되었습니다.',
  approved: '카드가 승인되었습니다.',
  rejected: '카드가 반려되었습니다.',
  published: '발행되었습니다.',
} as const;

// ============================================================================
// Default Values
// ============================================================================

export const DEFAULTS = {
  overlay_opacity: 0.3,
  headline_size: 36,
  body_size: 18,
  font_family: 'Pretendard',
  layout: 'center' as const,
} as const;

// ============================================================================
// Color Palettes (from design tokens)
// ============================================================================

export const COLOR_PALETTES = {
  calm: {
    name: '차분한',
    primary: '#7B9EBD',
    secondary: '#B8D4E3',
    accent: '#4A7C9B',
    background: '#F0F4F8',
  },
  warm: {
    name: '따뜻한',
    primary: '#E8A87C',
    secondary: '#F5D5C8',
    accent: '#D4856B',
    background: '#FFF5F0',
  },
  nature: {
    name: '자연',
    primary: '#7CB88E',
    secondary: '#C8E6C9',
    accent: '#4CAF50',
    background: '#F1F8E9',
  },
  soft: {
    name: '부드러운',
    primary: '#B39DDB',
    secondary: '#E1D5F0',
    accent: '#9575CD',
    background: '#F3E5F5',
  },
} as const;

// ============================================================================
// Font Options (Korean-compatible Google Fonts)
// ============================================================================

export const FONT_OPTIONS = [
  { family: 'Pretendard', label: 'Pretendard', category: 'gothic' },
  { family: 'Noto Sans KR', label: 'Noto Sans KR', category: 'gothic' },
  { family: 'Nanum Gothic', label: '나눔고딕', category: 'gothic' },
  { family: 'Nanum Myeongjo', label: '나눔명조', category: 'serif' },
  { family: 'Black Han Sans', label: 'Black Han Sans', category: 'display' },
  { family: 'Do Hyeon', label: 'Do Hyeon', category: 'display' },
  { family: 'Jua', label: 'Jua', category: 'display' },
  { family: 'Gothic A1', label: 'Gothic A1', category: 'gothic' },
  { family: 'IBM Plex Sans KR', label: 'IBM Plex Sans KR', category: 'gothic' },
  { family: 'Gmarket Sans', label: 'Gmarket Sans', category: 'gothic' },
] as const;

// ============================================================================
// Tailwind Breakpoints
// ============================================================================

export const BREAKPOINTS = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// ============================================================================
// Route Paths
// ============================================================================

export const ROUTES = {
  home: '/',
  editor: '/editor',
  editorDetail: (id: string) => `/editor/${id}`,
  apiCardSpecs: '/api/card-specs',
  apiCardSpecDetail: (id: string) => `/api/card-specs/${id}`,
  apiEditLogs: '/api/edit-logs',
  apiHealth: '/api/health',
} as const;
