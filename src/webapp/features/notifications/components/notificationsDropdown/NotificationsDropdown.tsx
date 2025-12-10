import useUnreadNotificationCount from '../../lib/queries/useUnreadNotificationCount';
import { RiNotification2Line } from 'react-icons/ri';
import {
  Anchor,
  CloseButton,
  Group,
  Indicator,
  Loader,
  NavLink,
  Popover,
  Stack,
  Text,
} from '@mantine/core';
import { usePathname } from 'next/navigation';
import NotificationsDropdownContent from './NotificationsDropdownContent';
import { Suspense, useState } from 'react';
import Link from 'next/link';

export default function NotificationsDropdown() {
  const [opened, setOpened] = useState(false);
  const { data } = useUnreadNotificationCount();
  const pathname = usePathname();
  const isActive = pathname === '/notifications';

  return (
    <Indicator
      disabled={data.unreadCount === 0}
      position={'top-start'}
      size={8}
      offset={10}
      color="tangerine"
    >
      <Popover position="bottom-start" shadow="sm" opened={opened}>
        <Popover.Target>
          <NavLink
            component="button"
            color="gray"
            c={'gray'}
            fw={600}
            label="Notifications"
            leftSection={<RiNotification2Line size={25} />}
            active={isActive}
            onClick={() => setOpened((opened) => !opened)}
          />
        </Popover.Target>
        <Popover.Dropdown w={400}>
          <Stack>
            <Group justify="space-between">
              <Text fw={600}>Notifications</Text>
              <CloseButton onClick={() => setOpened(false)} />
            </Group>
            <Suspense
              fallback={
                <Stack align="center" gap={'xs'}>
                  <Loader color={'gray'} size={'sm'} />
                  <Text fw={600} c={'gray'}>
                    Fetching notifications...
                  </Text>
                </Stack>
              }
            >
              <Stack align="center">
                <NotificationsDropdownContent />
                <Anchor
                  c={'dimmed'}
                  fw={600}
                  component={Link}
                  href={'/notifications'}
                  onClick={() => setOpened(false)}
                >
                  View all notifications
                </Anchor>
              </Stack>
            </Suspense>
          </Stack>
        </Popover.Dropdown>
      </Popover>
    </Indicator>
  );
}
