'use client';

import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query';
import type { ApiKey, NewApiKey } from '@semble/types';
import { apiKeyKeys } from './apiKeyKeys';
import * as dal from './dal';

export function useApiKeys() {
  const queryClient = useQueryClient();

  const { data: keys } = useSuspenseQuery<ApiKey[]>({
    queryKey: apiKeyKeys.list(),
    queryFn: () => dal.listApiKeys(),
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => dal.createApiKey(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiKeyKeys.all() });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      dal.updateApiKey(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiKeyKeys.all() });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => dal.revokeApiKey(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiKeyKeys.all() });
    },
  });

  const createKey = (name: string): Promise<NewApiKey> =>
    createMutation.mutateAsync(name);

  const updateKey = (id: string, name: string): Promise<ApiKey> =>
    updateMutation.mutateAsync({ id, name });

  const revokeKey = (id: string): Promise<void> =>
    revokeMutation.mutateAsync(id);

  return {
    keys,
    createKey,
    updateKey,
    revokeKey,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isRevoking: revokeMutation.isPending,
  };
}
