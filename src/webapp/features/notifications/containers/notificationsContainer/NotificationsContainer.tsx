'use client';

import useMyNotifications from '@/features/notifications/lib/queries/useMyNotifications';
import NotificationItem from '@/features/notifications/components/notificationItem/NotificationItem';
import {
  Stack,
  Text,
  Center,
  Container,
  Box,
  Loader,
  Button,
  Group,
  Collapse,
} from '@mantine/core';
import NotificationsContainerSkeleton from './Skeleton.NotificationsContainer';
import NotificationsContainerError from './Error.NotificationsContainer';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import RefetchButton from '@/components/navigation/refetchButton/RefetchButton';
import useMarkNotificationsAsRead from '../../lib/mutations/useMarkNotificationsAsRead';
import { useEffect, useRef, useState } from 'react';
import useMarkAllNotificationsAsRead from '../../lib/mutations/useMarkAllNotificationsAsRead';
import { IoCheckmarkDoneSharp } from 'react-icons/io5';
import useUnreadNotificationCount from '../../lib/queries/useUnreadNotificationCount';
import { CardSaveSource } from '@/features/analytics/types';
import { usePathname } from 'next/navigation';

export default function NotificationsContainer() {
  const pathname = usePathname();
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

  const { data: unreadData = { unreadCount: 0 } } =
    useUnreadNotificationCount();

  const markAllAsRead = useMarkAllNotificationsAsRead();
  const markAsRead = useMarkNotificationsAsRead();
  const hasMarkedAsRead = useRef(false);

  const allNotifications =
    data?.pages.flatMap((page) => page.notifications ?? []) ?? [];

  // Ensure animation is visible even for fast refetches
  const [showRefetchLoader, setShowRefetchLoader] = useState(false);
  const MIN_DISPLAY_TIME = 400; // milliseconds

  useEffect(() => {
    if (isRefetching) {
      setShowRefetchLoader(true);
    } else if (showRefetchLoader) {
      // Keep showing the loader for minimum time to ensure animation completes
      const timer = setTimeout(() => {
        setShowRefetchLoader(false);
      }, MIN_DISPLAY_TIME);
      return () => clearTimeout(timer);
    }
  }, [isRefetching, showRefetchLoader]);

  const handleMarkAllAsRead = () => {
    if (unreadData.unreadCount > 0) {
      hasMarkedAsRead.current = true;
      markAllAsRead.mutate();
    }
  };

  // Mark unread notifications as read when component unmounts
  useEffect(() => {
    return () => {
      if (!hasMarkedAsRead.current && allNotifications.length > 0) {
        const unreadIds = allNotifications
          .filter((notification) => !notification.read)
          .map((notification) => notification.id);

        if (unreadIds.length > 0) {
          hasMarkedAsRead.current = true;
          markAsRead.mutate({ notificationIds: unreadIds });
        }
      }
    };
  }, [allNotifications, markAsRead]);

  if (isPending) {
    return <NotificationsContainerSkeleton />;
  }

  if (error) {
    return <NotificationsContainerError />;
  }

  return (
    <Container p="xs" size="xl">
      {unreadData.unreadCount > 0 && (
        <Group justify="end" mb="md">
          <Button
            onClick={handleMarkAllAsRead}
            variant="light"
            color="tangerine"
            size="sm"
            leftSection={<IoCheckmarkDoneSharp size={18} />}
            loading={markAllAsRead.isPending}
          >
            Mark all as read
          </Button>
        </Group>
      )}
      <Collapse expanded={showRefetchLoader} transitionDuration={400}>
        <Stack align="center" gap={'xs'}>
          <Loader size={'sm'} color={'gray'} />
          <Text fw={600} c={'gray'} mb={'sm'}>
            Fetching the latest notifications...
          </Text>
        </Stack>
      </Collapse>
      {allNotifications.length === 0 ? (
        <Center>
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
                <NotificationItem
                  key={item.id}
                  item={item}
                  analyticsContext={{
                    saveSource: CardSaveSource.NOTIFICATIONS,
                    pagePath: pathname,
                  }}
                />
              ))}
            </Stack>
          </Stack>
        </InfiniteScroll>
      )}

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
