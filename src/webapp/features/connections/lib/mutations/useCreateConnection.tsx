import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createConnection } from '../dal';
import { connectionKeys } from '../connectionKeys';
import { CreateConnectionRequest } from '@semble/types';

export default function useCreateConnection() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (request: CreateConnectionRequest) => {
      return createConnection(request);
    },

    onSuccess: (_data, variables) => {
      // Invalidate all connection queries
      queryClient.invalidateQueries({ queryKey: connectionKeys.all() });

      // If source is URL, invalidate forward connections for that URL
      if (variables.sourceType === 'URL') {
        queryClient.invalidateQueries({
          queryKey: connectionKeys.forwardForUrl(variables.sourceValue),
        });
      }

      // If target is URL, invalidate backward connections for that URL
      if (variables.targetType === 'URL') {
        queryClient.invalidateQueries({
          queryKey: connectionKeys.backwardForUrl(variables.targetValue),
        });
      }
    },
  });

  return mutation;
}
