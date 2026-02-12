import { useMutation, useQueryClient } from '@tanstack/react-query';
import { followTarget } from '../dal';
import { followKeys } from '../followKeys';
import { FollowTargetRequest } from '@semble/types';
import { feedKeys } from '@/features/feeds/lib/feedKeys';

export default function useFollowTarget() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (request: FollowTargetRequest) => {
      return followTarget(request);
    },

    onSuccess: (_data, variables) => {
      // Invalidate all follow-related queries
      queryClient.invalidateQueries({ queryKey: followKeys.all() });

      // Invalidate feed queries since following affects the following feed
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
