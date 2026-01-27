import { AppShellFooter, Avatar, Group, Indicator } from '@mantine/core';
import { FaRegNoteSticky } from 'react-icons/fa6';
import { LuLibrary } from 'react-icons/lu';
import { MdOutlineEmojiNature } from 'react-icons/md';
import { BiSearch } from 'react-icons/bi';
import BottomBarItem from '../bottomBarItem/BottomBarItem';
import useMyProfile from '@/features/profile/lib/queries/useMyProfile';
import { RiNotification2Line } from 'react-icons/ri';
import useUnreadNotificationCount from '@/features/notifications/lib/queries/useUnreadNotificationCount';

export default function BottomBar() {
  const { data: profile } = useMyProfile();
  const { data: notificationData } = useUnreadNotificationCount();

  return (
    <AppShellFooter px={'sm'} pb={'lg'} py={'xs'} hiddenFrom="sm">
      <Group align="start" justify="space-around" gap={'lg'} h={'100%'}>
        <BottomBarItem href="/home" title="Home" icon={LuLibrary} />
        <BottomBarItem
          href="/explore"
          title="Explore"
          icon={MdOutlineEmojiNature}
        />

        <BottomBarItem href="/search" title="Search" icon={BiSearch} />

        <BottomBarItem
          href="/notifications"
          title="Notifications"
          icon={
            <Indicator
              disabled={notificationData.unreadCount === 0}
              position={'top-start'}
              size={8}
              offset={0}
              color="tangerine"
            >
              <RiNotification2Line size={22} />
            </Indicator>
          }
        />

        <BottomBarItem
          href={`/profile/${profile.handle}`}
          title={'Me'}
          icon={
            <Avatar
              src={profile.avatarUrl?.replace('avatar', 'avatar_thumbnail')}
            />
          }
        />
      </Group>
    </AppShellFooter>
  );
}
