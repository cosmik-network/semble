import { Analytics } from '@vercel/analytics/next';
import type { Metadata } from 'next';
import GlobalStyles from '@/styles/global.module.css';
import { ColorSchemeScript, mantineHtmlProps } from '@mantine/core';
import { Hanken_Grotesk } from 'next/font/google';
import Providers from '@/providers';
import { SPLASH_IMAGES } from '@/lib/consts/images';

export const metadata: Metadata = {
  title: 'Semble — A social knowledge network for research',
  description: `Follow your peers' research trails. Surface and discover new connections. Built on ATProto so you own your data.`,
  appleWebApp: {
    title: 'Semble',
    capable: true,
    statusBarStyle: 'default',
    startupImage: ['/semble-icon-192x192.png', ...SPLASH_IMAGES],
  },
  other: { 'apple-mobile-web-app-capable': 'yes' },
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
