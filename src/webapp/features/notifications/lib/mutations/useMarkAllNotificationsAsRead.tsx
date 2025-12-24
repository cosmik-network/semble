import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createSembleClient } from '@/services/client.apiClient';
import { notificationKeys } from '../notificationKeys';

export default function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const client = createSembleClient();

      return client.markAllNotificationsAsRead();
    },
    onSuccess: () => {
      // Invalidate and refetch notification queries
      queryClient.invalidateQueries({ queryKey: notificationKeys.all() });
    },
  });
}
