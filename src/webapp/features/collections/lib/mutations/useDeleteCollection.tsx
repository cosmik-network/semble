import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteCollection } from '../dal';
import { collectionKeys } from '../collectionKeys';
import { profileKeys } from '@/features/profile/lib/profileKeys';
import { tagKeys } from '@/features/tags/lib/tagKeys';

export default function useDeleteCollection() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (collectionId: string) => {
      return deleteCollection(collectionId);
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collectionKeys.all() });
      queryClient.invalidateQueries({ queryKey: profileKeys.all() });
      queryClient.invalidateQueries({ queryKey: tagKeys.all() });
    },
  });

  return mutation;
}
