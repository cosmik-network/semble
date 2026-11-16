import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createSembleClient } from '@/services/client.apiClient';
import { canvasKeys } from '../canvasKeys';

// Sharing is server-side only: an offline board has no link until it syncs
export default function useShareCanvas() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (variables: { id: string }) => {
      return createSembleClient().canvas.share({ canvasId: variables.id });
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: canvasKeys.all() });
    },
  });

  return mutation;
}
