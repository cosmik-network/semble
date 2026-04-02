import { Analytics } from '@vercel/analytics/next';
import type { Metadata, Viewport } from 'next';
import GlobalStyles from '@/styles/global.module.css';
import { ColorSchemeScript, mantineHtmlProps } from '@mantine/core';
import { Hanken_Grotesk } from 'next/font/google';
import Providers from '@/providers';
import { SPLASH_IMAGES } from '@/lib/consts/images';

export const viewport: Viewport = {
  interactiveWidget: 'overlays-content',
  themeColor: [
    {
      media: '(prefers-color-scheme: light)',
      color: 'var(--mantine-color-body)',
    },
    {
      media: '(prefers-color-scheme: dark)',
      color: 'var(--mantine-color-body)',
    },
  ],
};

export const metadata: Metadata = {
  title: 'Semble — A social knowledge network for research',
  description: `Follow your peers' research trails. Surface and discover new connections. Built on ATProto so you own your data.`,
  appleWebApp: {
    title: 'Semble',
    capable: true,
    statusBarStyle: 'default',
    startupImage: SPLASH_IMAGES,
  },
  other: {
    'apple-mobile-web-app-capable': 'yes',
    'mobile-web-app-capable': 'yes',
  },
};

const hankenGrotesk = Hanken_Grotesk({
  subsets: ['latin'],
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${hankenGrotesk.className}`}
      {...mantineHtmlProps}
    >
      <head>
        <ColorSchemeScript defaultColorScheme="auto" />
      </head>
      <body className={GlobalStyles.main}>
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
