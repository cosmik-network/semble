'use client';

import { AppShellFooter, Avatar, Group } from '@mantine/core';
import { MdOutlineEmojiNature } from 'react-icons/md';
import BottomBarItem from '../bottomBarItem/BottomBarItem';
import { useLoginUrlWithReturnTo } from '@/lib/auth/useLoginUrlWithReturnTo';

export default function GuestBottomBar() {
  const loginUrl = useLoginUrlWithReturnTo();
  return (
    <AppShellFooter px={'sm'} pb={'lg'} py={'xs'} hiddenFrom="sm">
      <Group align="start" justify="space-around" gap={'lg'} h={'100%'}>
        <BottomBarItem
          href="/explore"
          title="Explore"
          icon={MdOutlineEmojiNature}
        />
        <BottomBarItem href={loginUrl} title="Log in" icon={<Avatar />} />
      </Group>
    </AppShellFooter>
  );
}
