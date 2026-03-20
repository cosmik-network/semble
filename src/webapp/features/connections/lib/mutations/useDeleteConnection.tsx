import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteConnection } from '../dal';
import { connectionKeys } from '../connectionKeys';
import { feedKeys } from '@/features/feeds/lib/feedKeys';
import { DeleteConnectionRequest } from '@semble/types';
import { profileKeys } from '@/features/profile/lib/profileKeys';

export default function useDeleteConnection() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (request: DeleteConnectionRequest) => {
      return deleteConnection(request);
    },

    onSuccess: () => {
      // Invalidate all connection queries to ensure deletions are reflected everywhere
      queryClient.invalidateQueries({ queryKey: connectionKeys.all() });
      // Invalidate all feed queries to remove deleted connection items from feeds
      queryClient.invalidateQueries({ queryKey: feedKeys.all() });
      // Invalidate all profile queries with stats to update connectionCount in ProfileTabs
      queryClient.invalidateQueries({ queryKey: profileKeys.all() });
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
