import { useMutation, useQueryClient } from '@tanstack/react-query';
import { unfollowTarget } from '../dal';
import { followKeys } from '../followKeys';
import { feedKeys } from '@/features/feeds/lib/feedKeys';
import { collectionKeys } from '@/features/collections/lib/collectionKeys';
import { notificationKeys } from '@/features/notifications/lib/notificationKeys';
import { profileKeys } from '@/features/profile/lib/profileKeys';

interface UnfollowTargetParams {
  targetId: string;
  targetType: 'USER' | 'COLLECTION';
}

export default function useUnfollowTarget() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ targetId, targetType }: UnfollowTargetParams) => {
      return unfollowTarget(targetId, targetType);
    },

    onSuccess: (_data, variables) => {
      // Invalidate all follow-related queries
      queryClient.invalidateQueries({ queryKey: followKeys.all() });

      // Invalidate feed queries since unfollowing affects the following feed
      queryClient.invalidateQueries({ queryKey: feedKeys.all() });

      // Invalidate notifications to update follow status in notification items
      queryClient.invalidateQueries({ queryKey: notificationKeys.all() });

      // Invalidate profiles to update follow status and counts
      queryClient.invalidateQueries({ queryKey: profileKeys.all() });

      // Invalidate specific count queries for the target
      if (variables.targetType === 'USER') {
        queryClient.invalidateQueries({
          queryKey: followKeys.followersCount(variables.targetId),
        });
      } else if (variables.targetType === 'COLLECTION') {
        queryClient.invalidateQueries({
          queryKey: followKeys.collectionFollowersCount(variables.targetId),
        });
        // Invalidate collection queries to update isFollowing status
        queryClient.invalidateQueries({
          queryKey: collectionKeys.all(),
        });
      }
    },
  });

  return mutation;
}
