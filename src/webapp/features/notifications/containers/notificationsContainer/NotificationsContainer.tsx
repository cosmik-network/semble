'use client';

import useMyNotifications from '@/features/notifications/lib/queries/useMyNotifications';
import NotificationItem from '@/features/notifications/components/notificationItem/NotificationItem';
import { Stack, Container, Button, Group } from '@mantine/core';
import NotificationsContainerSkeleton from './Skeleton.NotificationsContainer';
import NotificationsContainerError from './Error.NotificationsContainer';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import RefetchLoader from '@/components/contentDisplay/refetchLoader/RefetchLoader';
import RefetchButton from '@/components/navigation/refetchButton/RefetchButton';
import useMarkNotificationsAsRead from '../../lib/mutations/useMarkNotificationsAsRead';
import { useEffect, useRef } from 'react';
import useMarkAllNotificationsAsRead from '../../lib/mutations/useMarkAllNotificationsAsRead';
import { IoCheckmarkDoneSharp } from 'react-icons/io5';
import useUnreadNotificationCount from '../../lib/queries/useUnreadNotificationCount';
import { CardSaveSource } from '@/features/analytics/types';
import { usePathname } from 'next/navigation';
import EmptyState from '@/components/contentDisplay/emptyState/EmptyState';
import { RiNotification2Line } from 'react-icons/ri';

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

  const handleMarkAllAsRead = () => {
    if (unreadData.unreadCount > 0) {
      hasMarkedAsRead.current = true;
      markAllAsRead.mutate();
    }
  };

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
      <RefetchLoader isRefetching={isRefetching} subject="notifications" />
      {allNotifications.length === 0 ? (
        <EmptyState icon={RiNotification2Line} message="No notifications yet" />
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

      <RefetchButton onRefetch={() => refetch()} />
    </Container>
  );
}
