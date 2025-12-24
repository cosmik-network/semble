'use client';

import { AppShell } from '@mantine/core';
import Navbar from '@/components/navigation/navbar/Navbar';
import ComposerDrawer from '@/features/composer/components/composerDrawer/ComposerDrawer';
import { useNavbarContext } from '@/providers/navbar';
import { usePathname } from 'next/navigation';
import BottomBar from '../bottomBar/BottomBar';
import { useMediaQuery } from '@mantine/hooks';

interface Props {
  children: React.ReactNode;
}

export default function AppLayout(props: Props) {
  const { mobileOpened, desktopOpened } = useNavbarContext();
  const isMobile = useMediaQuery('(max-width: 48em)', true); // "sm" breakpoint
  const pathname = usePathname();

  const ROUTES_WITH_ASIDE = ['/url'];
  const hasAside = ROUTES_WITH_ASIDE.some((prefix) =>
    pathname.startsWith(prefix),
  );
  const asideWidth = hasAside ? 300 : 0;

  return (
    <AppShell
      header={{ height: 0 }}
      navbar={{
        width: 300,
        breakpoint: 'xs',
        collapsed: { mobile: !mobileOpened, desktop: !desktopOpened },        
      }}
      aside={{
        width: asideWidth,
        breakpoint: 'xl',
        collapsed: { mobile: true },        
      }}
      footer={{
        height: isMobile ? 85 : 0,
      }}
    >
      <Navbar />

      <AppShell.Main>
        {props.children}
        <ComposerDrawer />
      </AppShell.Main>
      <BottomBar />
    </AppShell>
  );
}
