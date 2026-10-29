import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createConnection } from '../dal';
import { ConnectionType } from '@semble/types';
import { invalidateAfterConnectionCreated } from '../connectionInvalidation';

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

    onSuccess: (_data, variables) =>
      invalidateAfterConnectionCreated(queryClient, variables),
  });

  return mutation;
}
