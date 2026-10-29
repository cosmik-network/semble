import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateConnection } from '../dal';
import { invalidateAfterConnectionUpdated } from '../connectionInvalidation';
import { UpdateConnectionRequest } from '@semble/types';

export default function useUpdateConnection() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (request: UpdateConnectionRequest) => {
      return updateConnection(request);
    },

    onSuccess: (_data, request) => {
      invalidateAfterConnectionUpdated(queryClient, request);
    },
  });

  return mutation;
}
