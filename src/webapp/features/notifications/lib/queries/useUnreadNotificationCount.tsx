import { useSuspenseQuery } from '@tanstack/react-query';
import { getUnreadNotificationCount } from '../dal';
import { notificationKeys } from '../notificationKeys';

export default function useUnreadNotificationCount() {
  const query = useSuspenseQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: getUnreadNotificationCount,
    staleTime: 3000,
    refetchInterval: 20000,
    refetchOnWindowFocus: true,
  });

  return query;
}
