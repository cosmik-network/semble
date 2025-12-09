import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addUrlToLibrary } from '../dal';
import { cardKeys } from '../cardKeys';
import { collectionKeys } from '@/features/collections/lib/collectionKeys';
import { feedKeys } from '@/features/feeds/lib/feedKeys';
import { noteKeys } from '@/features/notes/lib/noteKeys';
import { sembleKeys } from '@/features/semble/lib/sembleKeys';

export default function useAddCard() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (newCard: {
      url: string;
      note?: string;
      collectionIds?: string[];
      viaCardId?: string;
    }) => {
      return addUrlToLibrary(newCard.url, {
        note: newCard.note,
        collectionIds: newCard.collectionIds,
        viaCardId: newCard.viaCardId,
      });
    },

    // Do things that are absolutely necessary and logic related (like query invalidation) in the useMutation callbacks
    // Do UI related things like redirects or showing toast notifications in mutate callbacks. If the user navigated away from the current screen before the mutation finished, those will purposefully not fire
    // https://tkdodo.eu/blog/mastering-mutations-in-react-query#some-callbacks-might-not-fire
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: cardKeys.all() });
      queryClient.invalidateQueries({ queryKey: noteKeys.all() });
      queryClient.invalidateQueries({ queryKey: feedKeys.all() });
      queryClient.invalidateQueries({ queryKey: sembleKeys.all() });
      queryClient.invalidateQueries({ queryKey: collectionKeys.mine() });
      queryClient.invalidateQueries({ queryKey: collectionKeys.infinite() });
      queryClient.invalidateQueries({ queryKey: collectionKeys.all() });
      queryClient.invalidateQueries({
        queryKey: collectionKeys.bySembleUrl(variables.url),
      });

      // invalidate each collection query individually
      variables.collectionIds?.forEach((id) => {
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
