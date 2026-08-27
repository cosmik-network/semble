import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { BsExclamation } from 'react-icons/bs';
import posthog from 'posthog-js';
import { FollowSource } from '@/features/analytics/types';
import { shouldCaptureAnalytics } from '@/features/analytics/utils';
import { feedKeys } from '@/features/feeds/lib/feedKeys';
import { profileKeys } from '@/features/profile/lib/profileKeys';
import { followManyUsers } from '../dal';
import { followKeys } from '../followKeys';

export function useFollowManyUsers(followSource?: FollowSource) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (targetIds: string[]) => followManyUsers(targetIds),
    onError: () => {
      notifications.show({
        message: 'Could not follow users',
        position: 'top-center',
        color: 'red',
        title: 'Error',
        icon: <BsExclamation />,
      });
    },
    onSuccess: (result) => {
      if (shouldCaptureAnalytics()) {
        posthog.capture('targets_bulk_followed', {
          followed_count: result.followedCount,
          follow_source: followSource,
        });
      }
      notifications.show({
        message: `Followed ${result.followedCount} ${result.followedCount === 1 ? 'user' : 'users'}`,
        position: 'top-center',
        color: 'green',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: followKeys.all() });
      queryClient.invalidateQueries({ queryKey: feedKeys.all() });
      queryClient.invalidateQueries({ queryKey: profileKeys.all() });
    },
  });

  return {
    followMany: mutation.mutate,
    isPending: mutation.isPending,
  };
}
