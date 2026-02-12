import { useMutation, useQueryClient } from '@tanstack/react-query';
import { unfollowTarget } from '../dal';
import { followKeys } from '../followKeys';
import { feedKeys } from '@/features/feeds/lib/feedKeys';

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

      // Invalidate specific count queries for the target
      if (variables.targetType === 'USER') {
        queryClient.invalidateQueries({
          queryKey: followKeys.followersCount(variables.targetId),
        });
      } else if (variables.targetType === 'COLLECTION') {
        queryClient.invalidateQueries({
          queryKey: followKeys.collectionFollowersCount(variables.targetId),
        });
      }
    },
  });

  return mutation;
}
