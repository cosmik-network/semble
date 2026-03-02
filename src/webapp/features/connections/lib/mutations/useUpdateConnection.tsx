import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateConnection } from '../dal';
import { connectionKeys } from '../connectionKeys';
import { UpdateConnectionRequest } from '@semble/types';

export default function useUpdateConnection() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (request: UpdateConnectionRequest) => {
      return updateConnection(request);
    },

    onSuccess: () => {
      // Invalidate all connection queries to ensure updates appear everywhere
      queryClient.invalidateQueries({ queryKey: connectionKeys.all() });
    },
  });

  return mutation;
}
