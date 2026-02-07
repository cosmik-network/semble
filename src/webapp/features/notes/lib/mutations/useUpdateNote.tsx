import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateNoteCard } from '../dal';
import { cardKeys } from '@/features/cards/lib/cardKeys';
import { collectionKeys } from '@/features/collections/lib/collectionKeys';
import { feedKeys } from '@/features/feeds/lib/feedKeys';
import { noteKeys } from '../noteKeys';

export default function useUpdateNote() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (note: { cardId: string; note: string }) => {
      return updateNoteCard(note);
    },

    onSuccess: (data) => {
      if (!data) return;
      queryClient.invalidateQueries({ queryKey: cardKeys.card(data.cardId) });
      queryClient.invalidateQueries({ queryKey: cardKeys.infinite() });
      queryClient.invalidateQueries({
        queryKey: cardKeys.infinite(data.cardId),
      });
      queryClient.invalidateQueries({ queryKey: cardKeys.all() });
      queryClient.invalidateQueries({ queryKey: noteKeys.all() });
      queryClient.invalidateQueries({ queryKey: feedKeys.all() });
      queryClient.invalidateQueries({ queryKey: collectionKeys.all() });
    },
  });

  return mutation;
}
