import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addAnnotationToLibrary } from '../dal';
import { cardKeys } from '../cardKeys';
import { collectionKeys } from '@/features/collections/lib/collectionKeys';
import { feedKeys } from '@/features/feeds/lib/feedKeys';
import { sembleKeys } from '@/features/semble/lib/sembleKeys';
import { connectionKeys } from '@/features/connections/lib/connectionKeys';
import { profileKeys } from '@/features/profile/lib/profileKeys';
import { TextQuoteSelector } from '@semble/types';

export default function useAddAnnotation() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (newAnnotation: {
      url: string;
      selectors: TextQuoteSelector[];
      note?: string;
      collectionIds?: string[];
      viaCardId?: string;
    }) => {
      return addAnnotationToLibrary(
        newAnnotation.url,
        newAnnotation.selectors,
        {
          note: newAnnotation.note,
          collectionIds: newAnnotation.collectionIds,
          viaCardId: newAnnotation.viaCardId,
        },
      );
    },

    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: cardKeys.all() });
      queryClient.invalidateQueries({ queryKey: feedKeys.all() });
      queryClient.invalidateQueries({ queryKey: sembleKeys.all() });
      queryClient.invalidateQueries({ queryKey: collectionKeys.mine() });
      queryClient.invalidateQueries({ queryKey: collectionKeys.infinite() });
      queryClient.invalidateQueries({ queryKey: collectionKeys.all() });
      queryClient.invalidateQueries({ queryKey: connectionKeys.all() });
      queryClient.invalidateQueries({ queryKey: profileKeys.all() });
      queryClient.invalidateQueries({
        queryKey: collectionKeys.bySembleUrl(variables.url),
      });
      queryClient.invalidateQueries({
        queryKey: cardKeys.urlMetadata(variables.url, {
          includeStats: true,
        }),
      });

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
