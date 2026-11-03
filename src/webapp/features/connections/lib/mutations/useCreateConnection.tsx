import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createConnection } from '../dal';
import { ConnectionType } from '@semble/types';
import { invalidateAfterConnectionCreated } from '../connectionInvalidation';
import posthog from 'posthog-js';
import { ConnectionCreatedEventProperties } from '@/features/analytics/types';
import { shouldCaptureAnalytics } from '@/features/analytics/utils';

export default function useCreateConnection() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (params: {
      sourceUrl: string;
      targetUrl: string;
      connectionType?: ConnectionType;
      note?: string;
      analytics?: ConnectionCreatedEventProperties;
    }) => {
      const { analytics: _analytics, ...request } = params;
      return createConnection(request);
    },

    onSuccess: (data, variables) => {
      // The DAL swallows its errors and resolves undefined, so only a returned
      // id means the connection was really created
      if (
        data?.connectionId &&
        variables.analytics &&
        shouldCaptureAnalytics()
      ) {
        posthog.capture('connection_created', variables.analytics);
      }
      invalidateAfterConnectionCreated(queryClient, variables);
    },
  });

  return mutation;
}
