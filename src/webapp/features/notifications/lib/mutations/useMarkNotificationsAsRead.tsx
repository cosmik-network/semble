import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createSembleClient } from '@/services/client.apiClient';
import { notificationKeys } from '../notificationKeys';
import type { MarkNotificationsAsReadRequest } from '@/api-client';

export default function useMarkNotificationsAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: MarkNotificationsAsReadRequest) => {
      const client = createSembleClient();

      return client.markNotificationsAsRead(request);
    },
    onSuccess: () => {
      // Invalidate and refetch notification queries
      queryClient.invalidateQueries({ queryKey: notificationKeys.all() });
    },
  });
}
