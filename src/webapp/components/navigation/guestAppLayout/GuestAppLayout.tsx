'use client';

import { AppShell } from '@mantine/core';
import { useNavbarContext } from '@/providers/navbar';
import GuestNavbar from '../guestNavbar/GuestNavbar';
import GuestBottomBar from '../guestBottomBar/GuestBottomBar';

interface Props {
  children: React.ReactNode;
}

export default function GuestAppLayout(props: Props) {
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
      <GuestNavbar />

      <AppShell.Main>{props.children}</AppShell.Main>

      <GuestBottomBar />
    </AppShell>
  );
}
