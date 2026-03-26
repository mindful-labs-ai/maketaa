import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Maketaa - AI 마케팅 콘텐츠 제작 도구',
    short_name: 'Maketaa',
    description: 'AI로 마케팅 콘텐츠를 쉽고 빠르게. 숏폼 영상, 카드뉴스를 자동으로 제작하세요.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0A0A0F',
    theme_color: '#7C5CFC',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };
}
