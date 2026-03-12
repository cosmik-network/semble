import { useMutation, useQueryClient } from '@tanstack/react-query';
import { removeCardFromLibrary } from '../dal';
import { cardKeys } from '../cardKeys';
import { collectionKeys } from '@/features/collections/lib/collectionKeys';
import { noteKeys } from '@/features/notes/lib/noteKeys';
import { feedKeys } from '@/features/feeds/lib/feedKeys';
import { sembleKeys } from '@/features/semble/lib/sembleKeys';

export default function useRemoveCardFromLibrary() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (cardId: string) => {
      return removeCardFromLibrary(cardId);
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cardKeys.all() });
      queryClient.invalidateQueries({ queryKey: noteKeys.all() });
      queryClient.invalidateQueries({ queryKey: feedKeys.all() });
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
    },
  });

  return mutation;
}
