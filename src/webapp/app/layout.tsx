import { Analytics } from '@vercel/analytics/next';
import type { Metadata, Viewport } from 'next';
import GlobalStyles from '@/styles/global.module.css';
import { ColorSchemeScript, mantineHtmlProps } from '@mantine/core';
import { Hanken_Grotesk } from 'next/font/google';
import Providers from '@/providers';
import { SPLASH_IMAGES } from '@/lib/consts/images';
import { dehydrate } from '@tanstack/react-query';
import { getServerSession } from '@/lib/auth/dal.server';
import { authKeys } from '@/lib/auth/authKeys';
import { profileKeys } from '@/features/profile/lib/profileKeys';
import { makeServerQueryClient } from '@/lib/queryClient';

export const viewport: Viewport = {
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
  title: 'Semble — Make sense of the web, together',
  description: `A place for mapping the web, connecting ideas, and building shared knowledge.`,
  appleWebApp: {
    title: 'Semble',
    capable: true,
    statusBarStyle: 'default',
    startupImage: SPLASH_IMAGES,
  },
  other: {
    'apple-mobile-web-app-capable': 'yes',
    'mobile-web-app-capable': 'yes',
    // DID for the semble.so atproto account
    'at:me': 'at://did:plc:k7wclckeajmuibxbamtbejjg',
  },
};

const hankenGrotesk = Hanken_Grotesk({
  subsets: ['latin'],
});

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The session has to be resolved here rather than in a nested layout:
  // AuthProvider owns the `['authenticated user']` query and lives in Providers,
  // so anything hydrated below it is already too late — the query would start a
  // client fetch first, `useAuth().isLoading` would flip true, and Dashboard
  // would swap the whole subtree for a skeleton right after hydration.
  //
  // This does hold the body behind one backend call, which the Next docs warn
  // about. It is the minimum: the shell's layout decision (authed vs guest) needs
  // the session, so there is nothing to stream ahead of it. Guests pay nothing —
  // getSession() returns null without any network call when no token is present.
  const session = await getServerSession();

  const queryClient = makeServerQueryClient();

  if (session.status === 'authenticated') {
    queryClient.setQueryData(authKeys.session(), session.user);

    // getServerSession() returns the backend's myProfile payload — the exact
    // response getMyProfile() fetches — so useMyProfile (a suspense query in
    // Navbar, BottomBar, ProfileMenu and CollectionsNavList) resolves from cache
    // during SSR instead of running its browser-only DAL. Also removes a
    // duplicate myProfile request on every page load.
    queryClient.setQueryData(profileKeys.mine(), session.user);
  } else if (session.status === 'guest') {
    queryClient.setQueryData(authKeys.session(), null);
  }
  // 'unresolved': seed nothing. A cached null would pin the user as a guest for
  // useAuth's 5-minute staleTime; leaving the key empty lets the client fetch
  // /api/auth/me, refresh the token and recover.

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
        <Providers dehydratedState={dehydrate(queryClient)}>
          {children}
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
