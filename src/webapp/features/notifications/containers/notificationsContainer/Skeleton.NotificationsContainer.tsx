import { Container, Stack, Title } from '@mantine/core';
import NotificationItemSkeleton from '../../components/notificationItem/Skeleton.NotificationItem';

export default function NotificationsContainerSkeleton() {
  return (
    <Container p="xs" size="xl">
      <Stack>
        <Title order={1}>Notifications</Title>

        <Stack gap={60} mx={'auto'} maw={600} w={'100%'} align="stretch">
          {Array.from({ length: 4 }).map((_, i) => (
            <NotificationItemSkeleton key={i} />
          ))}
        </Stack>
      </Stack>
    </Container>
  );
}
