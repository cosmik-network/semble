import { Indicator } from '@mantine/core';
import useUnreadNotificationCount from '../../lib/queries/useUnreadNotificationCount';
import NavItem from '@/components/navigation/navItem/NavItem';
import { RiNotification2Line } from 'react-icons/ri';

export default function NotificationNavItem() {
  const { data } = useUnreadNotificationCount();

  return (
    <Indicator
      disabled={data.unreadCount === 0}
      position={'top-start'}
      size={8}
      offset={10}
      color="tangerine"
    >
      <NavItem
        href="/notifications"
        label="Notifications"
        icon={<RiNotification2Line size={25} />}
      />
    </Indicator>
  );
}
