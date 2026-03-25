export const CREDIT_COSTS = {
  // 이미지 생성
  IMAGE_GEMINI: 5,
  IMAGE_GPT: 8,
  IMAGE_PARALLEL: 5,

  // 영상 생성
  VIDEO_SEEDANCE_PRO: 20,
  VIDEO_SEEDANCE_LITE: 12,
  VIDEO_KLING: 20,

  // 숏폼 메이커
  SCENE_GENERATE: 3,
  SCENE_REGENERATE: 2,
  NARRATION: 4,

  // 카드뉴스
  CARD_NEWS_GENERATE: 8,
  CARD_NEWS_TOPICS: 1,

  // 인스타그램
  INSTA_CAPTION: 1,
  INSTA_REPLY: 1,

  // GIF
  GIF_FRAME: 5,

  // 분석
  WEBSITE_ANALYSIS: 10,
} as const;

export type CreditCostKey = keyof typeof CREDIT_COSTS;

export const CREDIT_DESCRIPTIONS: Record<CreditCostKey, string> = {
  IMAGE_GEMINI: '이미지 생성 (Gemini)',
  IMAGE_GPT: '이미지 생성 (GPT)',
  IMAGE_PARALLEL: '병렬 이미지 생성',
  VIDEO_SEEDANCE_PRO: '영상 생성 (SeeDance Pro)',
  VIDEO_SEEDANCE_LITE: '영상 생성 (SeeDance Lite)',
  VIDEO_KLING: '영상 생성 (Kling)',
  SCENE_GENERATE: '씬 생성',
  SCENE_REGENERATE: '씬 재생성',
  NARRATION: 'TTS 나레이션',
  CARD_NEWS_GENERATE: '카드뉴스 생성',
  CARD_NEWS_TOPICS: '카드뉴스 주제 추천',
  INSTA_CAPTION: '인스타 캡션 생성',
  INSTA_REPLY: '인스타 댓글 답변',
  GIF_FRAME: 'GIF 프레임 생성',
  WEBSITE_ANALYSIS: '웹사이트 분석',
};
