import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteConnection } from '../dal';
import { DeleteConnectionRequest } from '@semble/types';
import { invalidateAfterConnectionDeleted } from '../connectionInvalidation';

export default function useDeleteConnection() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (request: DeleteConnectionRequest) => {
      return deleteConnection(request);
    },

    onSuccess: (_data, request) =>
      invalidateAfterConnectionDeleted(queryClient, request),
  });

  return mutation;
}
