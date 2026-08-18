'use client';

import { AppShell } from '@mantine/core';
import { useNavbarContext } from '@/providers/navbar';
import NavbarSkeleton from '../navbar/Skeleton.Navbar';
import BottomBarSkeleton from '../bottomBar/Skeleton.BottomBar';

interface Props {
  children: React.ReactNode;
}

export default function AppLayoutSkeleton(props: Props) {
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
      <NavbarSkeleton />
      <AppShell.Main>{props.children}</AppShell.Main>
      <BottomBarSkeleton />
    </AppShell>
  );
}
