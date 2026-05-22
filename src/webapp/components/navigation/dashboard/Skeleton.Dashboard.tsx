'use client';

import { AppShell, Center, Stack, Text } from '@mantine/core';
import { useNavbarContext } from '@/providers/navbar';
import { useMediaQuery } from '@mantine/hooks';
import NavbarSkeleton from '../navbar/Skeleton.Navbar';
import BottomBarSkeleton from '../bottomBar/Skeleton.BottomBar';
import classes from './Skeleton.Dashboard.module.css';
import Header from '../header/Header';

export default function DashboardSkeleton() {
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
    >
      <NavbarSkeleton />

      <AppShell.Main>
        <Header />

        <Center mih="100dvh">
          <Stack align="center" gap="xs">
            <Text size="lg" c="gray.6" className={classes.fade}>
              ⋆ ˚ ✿ ˚ ⋆
            </Text>
            <Text fw={700} size="sm" c="dimmed" className={classes.fade}>
              loading
            </Text>
          </Stack>
        </Center>
      </AppShell.Main>

      <BottomBarSkeleton />
    </AppShell>
  );
}
