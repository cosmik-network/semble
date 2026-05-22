import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteCollection } from '../dal';
import { collectionKeys } from '../collectionKeys';
import { profileKeys } from '@/features/profile/lib/profileKeys';

export default function useDeleteCollection() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (collectionId: string) => {
      return deleteCollection(collectionId);
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collectionKeys.all() });
      queryClient.invalidateQueries({ queryKey: profileKeys.all() });
    },
  });

  return mutation;
}
