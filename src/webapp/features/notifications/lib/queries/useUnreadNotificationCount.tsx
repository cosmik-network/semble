import { useQuery } from '@tanstack/react-query';
import { getUnreadNotificationCount } from '../dal';
import { notificationKeys } from '../notificationKeys';
import { useAuth } from '@/hooks/useAuth';

export default function useUnreadNotificationCount() {
  const { isAuthenticated } = useAuth();

  const query = useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: getUnreadNotificationCount,
    enabled: isAuthenticated,
    staleTime: 3000,
    refetchInterval: 20000,
    refetchOnWindowFocus: true,
  });

  return query;
}
