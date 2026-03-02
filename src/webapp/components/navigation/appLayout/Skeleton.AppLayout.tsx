'use client';

import { AppShell } from '@mantine/core';
import { useNavbarContext } from '@/providers/navbar';
import { useMediaQuery } from '@mantine/hooks';
import NavbarSkeleton from '../navbar/Skeleton.Navbar';
import BottomBarSkeleton from '../bottomBar/Skeleton.BottomBar';

interface Props {
  children: React.ReactNode;
}

export default function AppLayoutSkeleton(props: Props) {
  const { mobileOpened, desktopOpened } = useNavbarContext();
  const isMobile = useMediaQuery('(max-width: 48em)', true); // "sm" breakpoint

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
        height: isMobile ? 85 : 0,
      }}
    >
      <NavbarSkeleton />
      <AppShell.Main>{props.children}</AppShell.Main>
      <BottomBarSkeleton />
    </AppShell>
  );
}
