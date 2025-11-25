import { AppShellFooter, Avatar, Group } from '@mantine/core';
import { FaRegNoteSticky } from 'react-icons/fa6';
import { LuLibrary } from 'react-icons/lu';
import { MdOutlineEmojiNature } from 'react-icons/md';
import BottomBarItem from '../bottomBarItem/BottomBarItem';
import useMyProfile from '@/features/profile/lib/queries/useMyProfile';

export default function BottomBar() {
  const { data: profile } = useMyProfile();

  return (
    <AppShellFooter px={'sm'} pb={'lg'} py={'xs'} hiddenFrom="sm">
      <Group align="start" justify="space-around" gap={'lg'} h={'100%'}>
        <BottomBarItem href="/home" title="Home" icon={LuLibrary} />
        <BottomBarItem
          href="/explore"
          title="Explore"
          icon={MdOutlineEmojiNature}
        />
        <BottomBarItem
          href={`/profile/${profile.handle}/cards`}
          title="Cards"
          icon={FaRegNoteSticky}
        />
        <BottomBarItem
          href={`/profile/${profile.handle}`}
          title={'Profile'}
          icon={<Avatar src={profile.avatarUrl} />}
        />
      </Group>
    </AppShellFooter>
  );
}
