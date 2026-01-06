import { useSuspenseQuery } from '@tanstack/react-query';
import { getUnreadNotificationCount } from '../dal';
import { notificationKeys } from '../notificationKeys';

export default function useUnreadNotificationCount() {
  const query = useSuspenseQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: getUnreadNotificationCount,
    staleTime: 3000, // 20 seconds
    refetchInterval: 5000, // Refetch every 30 seconds
    refetchOnWindowFocus: true,
  });

  return query;
}
