import type { Metadata } from 'next';
import { ReactNode } from 'react';
import { Providers } from '~/components/providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'tRPC Studio Example - Next.js 14 App Router',
  description:
    'Comprehensive Next.js 14 example using tRPC Studio with App Router, Tailwind v4, and SuperJSON',
  keywords: [
    'tRPC',
    'Next.js',
    'TypeScript',
    'Tailwind CSS',
    'SuperJSON',
    'TanStack Query',
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
