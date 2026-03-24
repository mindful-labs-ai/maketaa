import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Canvas Editor - Mental Health Card News',
  description: 'Card design and editing tool for Mental Health Card News',
  viewport: 'width=device-width, initial-scale=1',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700&family=Nanum+Gothic:wght@400;700&family=Nanum+Myeongjo:wght@400;700&family=Black+Han+Sans&family=Do+Hyeon&family=Jua&family=Gothic+A1:wght@400;700&family=IBM+Plex+Sans+KR:wght@400;700&family=Gmarket+Sans:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-gray-50">{children}</body>
    </html>
  );
}
