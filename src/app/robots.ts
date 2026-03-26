import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/*',
          '/dashboard/*',
          '/card-news/*',
          '/video/*',
          '/image/*',
          '/makerScript/*',
          '/analyze/*',
          '/report/*',
          '/credits/*',
          '/history/*',
          '/settings/*',
          '/insta/*',
          '/gif/*',
        ],
      },
    ],
    sitemap: 'https://maketaa.com/sitemap.xml',
  };
}
