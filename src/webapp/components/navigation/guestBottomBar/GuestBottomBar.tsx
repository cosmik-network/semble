import { AppShellFooter, Avatar, Group } from '@mantine/core';
import { MdOutlineEmojiNature } from 'react-icons/md';
import { BiSearch } from 'react-icons/bi';
import BottomBarItem from '../bottomBarItem/BottomBarItem';

export default function GuestBottomBar() {
  return (
    <AppShellFooter px={'sm'} pb={'lg'} py={'xs'} hiddenFrom="sm">
      <Group align="start" justify="space-around" gap={'lg'} h={'100%'}>
        <BottomBarItem
          href="/explore"
          title="Explore"
          icon={MdOutlineEmojiNature}
        />
        <BottomBarItem href="/search" title="Search" icon={BiSearch} />
        <BottomBarItem href="/login" title="Log in" icon={<Avatar />} />
      </Group>
    </AppShellFooter>
  );
}
