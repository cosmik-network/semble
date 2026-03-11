import { useMutation, useQueryClient } from '@tanstack/react-query';
import { removeCardFromCollection } from '../dal';
import { collectionKeys } from '@/features/collections/lib/collectionKeys';
import { sembleKeys } from '@/features/semble/lib/sembleKeys';

export default function useRemoveCardFromCollections() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({
      cardId,
      collectionIds,
    }: {
      cardId: string;
      collectionIds: string[];
    }) => {
      return removeCardFromCollection({ cardId, collectionIds });
    },

    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: collectionKeys.infinite() });
      queryClient.invalidateQueries({ queryKey: collectionKeys.mine() });
      queryClient.invalidateQueries({ queryKey: collectionKeys.all() });
      queryClient.invalidateQueries({ queryKey: sembleKeys.all() });
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

      variables.collectionIds.forEach((id) => {
        queryClient.invalidateQueries({
          queryKey: collectionKeys.collection(id),
        });
        queryClient.invalidateQueries({
          queryKey: collectionKeys.infinite(id),
        });
      });
    },
  });

  return mutation;
}
