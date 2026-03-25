import type { Metadata } from 'next';
import './globals.css';
import { ToastContainer } from '@/components/ui/toast';

export const metadata: Metadata = {
  title: 'Maketaa',
  description: 'AI로 마케팅 콘텐츠를 쉽고 빠르게',
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
