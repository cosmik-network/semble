import { Stack, Text } from '@mantine/core';
import useMyNotifications from '../../lib/queries/useMyNotifications';

export default function NotificationsDropdownContent() {
  const { data } = useMyNotifications({ limit: 10 });

  const allNotifications =
    data?.pages.flatMap((page) => page.notifications ?? []) ?? [];

  return (
    <Stack align="center">
      {allNotifications.length !== 0 ? (
        <Text fw={500}>You have no notifications</Text>
      ) : (
        <></>
      )}
    </Stack>
  );
}
