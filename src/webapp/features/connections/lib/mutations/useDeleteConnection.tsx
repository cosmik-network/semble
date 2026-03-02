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
    },
  });

  return mutation;
}
