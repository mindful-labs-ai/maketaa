import type { Metadata } from 'next';
import './globals.css';
import { ToastContainer } from '@/components/ui/toast';

export const metadata: Metadata = {
  metadataBase: new URL('https://maketaa.com'),
  title: {
    default: 'Maketaa - AI 마케팅 콘텐츠 제작 도구',
    template: '%s | Maketaa',
  },
  description:
    'AI로 마케팅 콘텐츠를 쉽고 빠르게. URL만 입력하면 AI가 맞춤 마케팅 전략을 분석하고, 숏폼 영상과 카드뉴스를 자동으로 제작합니다.',
  keywords: [
    'AI 마케팅',
    '마케팅 자동화',
    '숏폼 영상 제작',
    '카드뉴스 메이커',
    'AI 콘텐츠 제작',
    'SNS 마케팅',
    '마케팅 전략',
    'AI 영상 제작',
    '콘텐츠 마케팅',
    'Maketaa',
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  alternates: {
    canonical: 'https://maketaa.com',
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: 'https://maketaa.com',
    siteName: 'Maketaa',
    title: 'Maketaa - AI 마케팅 콘텐츠 제작 도구',
    description:
      'URL만 입력하면 AI가 맞춤 마케팅 전략을 분석하고, 숏폼 영상과 카드뉴스를 자동으로 제작합니다.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Maketaa - AI 마케팅 콘텐츠 제작 도구',
    description:
      'URL만 입력하면 AI가 맞춤 마케팅 전략을 분석하고, 숏폼 영상과 카드뉴스를 자동으로 제작합니다.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='ko-KR' className='dark'>
      <head>
        <link
          rel='stylesheet'
          as='style'
          crossOrigin='anonymous'
          href='https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css'
        />
      </head>
      <body className='antialiased'>
        {children}
        <ToastContainer />
      </body>
    </html>
  );
}
