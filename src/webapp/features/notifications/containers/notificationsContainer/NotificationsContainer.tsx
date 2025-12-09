'use client';

import useMyNotifications from '@/features/notifications/lib/queries/useMyNotifications';
import NotificationItem from '@/features/notifications/components/notificationItem/NotificationItem';
import {
  Stack,
  Title,
  Text,
  Center,
  Container,
  Box,
  Loader,
} from '@mantine/core';
import NotificationsContainerSkeleton from './Skeleton.NotificationsContainer';
import NotificationsContainerError from './Error.NotificationsContainer';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import RefetchButton from '@/components/navigation/refetchButton/RefetchButton';
import useMarkNotificationsAsRead from '../../lib/mutations/useMarkNotificationsAsRead';
import { useEffect, useRef } from 'react';

export default function NotificationsContainer() {
  const {
    data,
    error,
    isPending,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isRefetching,
    refetch,
  } = useMyNotifications();

  const markAsReadMutation = useMarkNotificationsAsRead();
  const hasMarkedAsRead = useRef(false);

  const allNotifications =
    data?.pages.flatMap((page) => page.notifications ?? []) ?? [];

  // Mark unread notifications as read when component unmounts
  useEffect(() => {
    return () => {
      if (!hasMarkedAsRead.current && allNotifications.length > 0) {
        const unreadIds = allNotifications
          .filter(notification => !notification.read)
          .map(notification => notification.id);
        
        if (unreadIds.length > 0) {
          hasMarkedAsRead.current = true;
          markAsReadMutation.mutate({ notificationIds: unreadIds });
        }
      }
    };
  }, [allNotifications, markAsReadMutation]);

  if (isPending) {
    return <NotificationsContainerSkeleton />;
  }

  if (error) {
    return <NotificationsContainerError />;
  }

  return (
    <Container p="xs" size="xl">
      <Stack>
        <Title order={1}>Notifications</Title>
        {isRefetching && (
          <Stack align="center" gap={'xs'}>
            <Loader color={'gray'} />
            <Text fw={600} c={'gray'}>
              Fetching the latest notifications...
            </Text>
          </Stack>
        )}
        {allNotifications.length === 0 ? (
          <Center h={200}>
            <Text fz="h3" fw={600} c="gray">
              No notifications yet
            </Text>
          </Center>
        ) : (
          <InfiniteScroll
            dataLength={allNotifications.length}
            hasMore={!!hasNextPage}
            isInitialLoading={isPending}
            isLoading={isFetchingNextPage}
            loadMore={fetchNextPage}
          >
            <Stack gap={'xl'} mx={'auto'} maw={600} w={'100%'}>
              <Stack gap={60}>
                {allNotifications.map((item) => (
                  <NotificationItem key={item.id} item={item} />
                ))}
              </Stack>
            </Stack>
          </InfiniteScroll>
        )}
      </Stack>

      <Box
        pos={'fixed'}
        bottom={0}
        mt={'md'}
        mx={{ base: 10, sm: 2.5 }}
        mb={{ base: 100, sm: 'md' }}
        style={{ zIndex: 2 }}
      >
        <RefetchButton onRefetch={() => refetch()} />
      </Box>
    </Container>
  );
}
