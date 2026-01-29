import { CollectionAccessType } from '@semble/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateCollection } from '../dal';
import { collectionKeys } from '../collectionKeys';

export default function useUpdateCollection() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (collection: {
      collectionId: string;
      rkey: string;
      name: string;
      description?: string;
      accessType?: CollectionAccessType;
    }) => {
      return updateCollection(collection);
    },

    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: collectionKeys.collection(variables.collectionId),
      });
      queryClient.invalidateQueries({
        queryKey: collectionKeys.all(),
      });
    },
  });

  return mutation;
}
