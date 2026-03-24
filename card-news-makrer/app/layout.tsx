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
      <body className="bg-gray-50">{children}</body>
    </html>
  );
}
