import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateConnection } from '../dal';
import { invalidateAfterConnectionUpdated } from '../connectionInvalidation';
import { UpdateConnectionRequest } from '@semble/types';
import posthog from 'posthog-js';
import { ConnectionUpdatedEventProperties } from '@/features/analytics/types';
import { shouldCaptureAnalytics } from '@/features/analytics/utils';

export default function useUpdateConnection() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({
      analytics: _analytics,
      ...request
    }: UpdateConnectionRequest & {
      analytics?: ConnectionUpdatedEventProperties;
    }) => {
      return updateConnection(request);
    },

    onSuccess: (_data, variables) => {
      if (variables.analytics && shouldCaptureAnalytics()) {
        posthog.capture('connection_updated', variables.analytics);
      }
      invalidateAfterConnectionUpdated(queryClient, variables);
    },
  });

  return mutation;
}
