import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateConnection } from '../dal';
import { connectionKeys } from '../connectionKeys';
import { feedKeys } from '@/features/feeds/lib/feedKeys';
import { UpdateConnectionRequest } from '@semble/types';

export default function useUpdateConnection() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (request: UpdateConnectionRequest) => {
      return updateConnection(request);
    },

    onSuccess: () => {
      // Invalidate all connection queries to ensure updates appear everywhere
      queryClient.invalidateQueries({ queryKey: connectionKeys.all() });
      // Invalidate all feed queries to update connection items in feeds
      queryClient.invalidateQueries({ queryKey: feedKeys.all() });
      // Invalidate all URL metadata queries with stats to update tab counts
      queryClient.invalidateQueries({
        predicate: (query): boolean => {
          const key = query.queryKey as unknown[];
          return !!(
            key[0] === 'cards' &&
            key[1] === 'metadata' &&
            key[3] &&
            typeof key[3] === 'object' &&
            'includeStats' in key[3] &&
            key[3].includeStats === true
          );
        },
      });
    },
  });

  return mutation;
}
