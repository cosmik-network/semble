'use client';

import { AppShell } from '@mantine/core';
import { useNavbarContext } from '@/providers/navbar';
import GuestNavbar from '../guestNavbar/GuestNavbar';
import GuestBottomBar from '../guestBottomBar/GuestBottomBar';
import { useMediaQuery } from '@mantine/hooks';

interface Props {
  children: React.ReactNode;
}

export default function GuestAppLayout(props: Props) {
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
        height: isMobile ? 80 : 0,
      }}
    >
      <GuestNavbar />

      <AppShell.Main>{props.children}</AppShell.Main>

      <GuestBottomBar />
    </AppShell>
  );
}
