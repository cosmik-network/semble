'use client';

import { AppShellFooter, Avatar, Group } from '@mantine/core';
import { MdOutlineEmojiNature } from 'react-icons/md';
import BottomBarItem from '../bottomBarItem/BottomBarItem';
import { useLoginHref } from '@/lib/auth/useLoginHref';

export default function GuestBottomBar() {
  const loginHref = useLoginHref();
  return (
    <AppShellFooter px={'sm'} pb={'lg'} py={'xs'} hiddenFrom="sm">
      <Group align="start" justify="space-around" gap={'lg'} h={'100%'}>
        <BottomBarItem
          href="/explore"
          title="Explore"
          icon={MdOutlineEmojiNature}
        />
        <BottomBarItem href={loginHref} title="Log in" icon={<Avatar />} />
      </Group>
    </AppShellFooter>
  );
}
