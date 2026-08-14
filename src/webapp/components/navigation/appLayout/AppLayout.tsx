'use client';

import { AppShell } from '@mantine/core';
import Navbar from '@/components/navigation/navbar/Navbar';
import ComposerDrawer from '@/features/composer/components/composerDrawer/ComposerDrawer';
import { useNavbarContext } from '@/providers/navbar';
import BottomBar from '../bottomBar/BottomBar';
import { Suspense } from 'react';
import NavbarSkeleton from '../navbar/Skeleton.Navbar';
import BottomBarSkeleton from '../bottomBar/Skeleton.BottomBar';

interface Props {
  children: React.ReactNode;
}

export default function AppLayout(props: Props) {
  const { mobileOpened, desktopOpened } = useNavbarContext();

  return (
    <AppShell
      header={{ height: 0 }}
      navbar={{
        width: 300,
        breakpoint: 'xs',
        collapsed: { mobile: !mobileOpened, desktop: !desktopOpened },
      }}
      aside={{
        width: 0,
        breakpoint: 'xl',
        collapsed: { mobile: true },
      }}
      footer={{
        height: { base: 85, sm: 0 },
      }}
    >
      <Suspense fallback={<NavbarSkeleton />}>
        <Navbar />
      </Suspense>

      <AppShell.Main>
        {props.children}

        <Suspense>
          <ComposerDrawer />
        </Suspense>
      </AppShell.Main>

      <Suspense fallback={<BottomBarSkeleton />}>
        <BottomBar />
      </Suspense>
    </AppShell>
  );
}
