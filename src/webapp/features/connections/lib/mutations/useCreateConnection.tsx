import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createConnection } from '../dal';
import { connectionKeys } from '../connectionKeys';
import { ConnectionType } from '@semble/types';

export default function useCreateConnection() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (params: {
      sourceUrl: string;
      targetUrl: string;
      connectionType?: ConnectionType;
      note?: string;
    }) => {
      return createConnection(params);
    },

    onSuccess: (_data, variables) => {
      // Invalidate all connection queries
      queryClient.invalidateQueries({ queryKey: connectionKeys.all() });

      // Invalidate forward connections for source URL
      queryClient.invalidateQueries({
        queryKey: connectionKeys.forwardForUrl(variables.sourceUrl),
      });

      // Invalidate backward connections for target URL
      queryClient.invalidateQueries({
        queryKey: connectionKeys.backwardForUrl(variables.targetUrl),
      });
    },
  });

  return mutation;
}
