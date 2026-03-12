import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteConnection } from '../dal';
import { connectionKeys } from '../connectionKeys';
import { DeleteConnectionRequest } from '@semble/types';

export default function useDeleteConnection() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (request: DeleteConnectionRequest) => {
      return deleteConnection(request);
    },

    onSuccess: () => {
      // Invalidate all connection queries to ensure deletions are reflected everywhere
      queryClient.invalidateQueries({ queryKey: connectionKeys.all() });
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
