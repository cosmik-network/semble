'use client';

import { AppShellFooter, Avatar, Group } from '@mantine/core';
import { HiOutlineHome } from 'react-icons/hi';
import { MdOutlineEmojiNature } from 'react-icons/md';
import { BiSearch } from 'react-icons/bi';
import BottomBarItem from '../bottomBarItem/BottomBarItem';
import { useLoginHref } from '@/hooks/useLoginHref';

export default function GuestBottomBar() {
  const loginHref = useLoginHref();

  return (
    <AppShellFooter px={'sm'} pb={'lg'} py={'xs'} hiddenFrom="sm">
      <Group align="start" justify="space-around" gap={'lg'} h={'100%'}>
        <BottomBarItem href="/home" title="Home" icon={HiOutlineHome} />
        <BottomBarItem
          href="/explore"
          title="Explore"
          icon={MdOutlineEmojiNature}
        />
        <BottomBarItem href="/search" title="Search" icon={BiSearch} />
        <BottomBarItem href={loginHref} title="Log in" icon={<Avatar />} />
      </Group>
    </AppShellFooter>
  );
}
