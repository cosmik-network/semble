import { useQuery } from '@tanstack/react-query';
import { getUnreadNotificationCount } from '../dal';
import { notificationKeys } from '../notificationKeys';
import { useAuth } from '@/hooks/useAuth';
import { ApiError } from '@/api-client';

export default function useUnreadNotificationCount() {
  const { logout } = useAuth();

  const query = useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: async () => {
      try {
        return await getUnreadNotificationCount();
      } catch (error) {
        if (error instanceof ApiError && error.statusCode === 401) {
          logout();
        }
        throw error;
      }
    },
    staleTime: 3000,
    refetchInterval: 20000,
    refetchOnWindowFocus: true,
  });

  return query;
}
