import { createSembleClient } from '@/services/client.apiClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cardKeys } from '../cardKeys';
import { collectionKeys } from '@/features/collections/lib/collectionKeys';
import { noteKeys } from '@/features/notes/lib/noteKeys';
import { sembleKeys } from '@/features/semble/lib/sembleKeys';
import { feedKeys } from '@/features/feeds/lib/feedKeys';

export default function useUpdateCardAssociations() {
  const client = createSembleClient();

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (updatedCard: {
      cardId: string;
      note?: string;
      addToCollectionIds?: string[];
      removeFromCollectionIds?: string[];
      viaCardId?: string;
    }) => {
      return client.updateUrlCardAssociations({
        cardId: updatedCard.cardId,
        note: updatedCard.note,
        addToCollections: updatedCard.addToCollectionIds,
        removeFromCollections: updatedCard.removeFromCollectionIds,
        viaCardId: updatedCard.viaCardId,
      });
    },

    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: cardKeys.all() });
      queryClient.invalidateQueries({ queryKey: noteKeys.all() });
      queryClient.invalidateQueries({ queryKey: feedKeys.all() });
      queryClient.invalidateQueries({ queryKey: sembleKeys.all() });
      queryClient.invalidateQueries({ queryKey: collectionKeys.all() });

      // invalidate each collection query individually
      variables.addToCollectionIds?.forEach((id) => {
        queryClient.invalidateQueries({
          queryKey: collectionKeys.collection(id),
        });
      });

      variables.removeFromCollectionIds?.forEach((id) => {
        queryClient.invalidateQueries({
          queryKey: collectionKeys.collection(id),
        });
      });
    },
  });

  return mutation;
}
