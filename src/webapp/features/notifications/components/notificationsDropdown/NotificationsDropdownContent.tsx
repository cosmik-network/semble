import { ScrollArea, Stack, Text } from '@mantine/core';
import useMyNotifications from '../../lib/queries/useMyNotifications';
import { Fragment } from 'react';
import NotificationDropdownItem from './NotificationDropdownItem';

export default function NotificationsDropdownContent() {
  const { data } = useMyNotifications({ limit: 10 });

  const allNotifications =
    data?.pages.flatMap((page) => page.notifications ?? []) ?? [];

  return (
    <ScrollArea.Autosize mah={450} type="auto">
      <Stack align="center" gap={'xs'}>
        {allNotifications.length === 0 ? (
          <Text fw={500}>You have no notifications</Text>
        ) : (
          <Fragment>
            {allNotifications.map((item) => (
              <NotificationDropdownItem key={item.id} item={item} />
            ))}
          </Fragment>
        )}
      </Stack>
    </ScrollArea.Autosize>
  );
}
