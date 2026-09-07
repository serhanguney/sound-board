import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { FAVICON_IDLE, FAVICON_TYPE } from '@/features/soundboard/favicon';
import { Providers } from './providers';

const ui = Inter({
  subsets: ['latin'],
  variable: '--font-ui',
  display: 'swap',
});

const display = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Soundboard',
  description: 'Queue sound effects for team meetings',
  // The board swaps this for the playing variant once a sound goes out; see
  // `useFavicon`. Declared here so the tab is right before any of that runs.
  icons: { icon: { url: FAVICON_IDLE, type: FAVICON_TYPE } },
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={`${ui.variable} ${display.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
