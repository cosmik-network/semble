import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createSembleClient } from '@/services/client.apiClient';
import { canvasKeys } from '../canvasKeys';

export default function useUnshareCanvas() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (variables: { id: string }) => {
      return createSembleClient().canvas.unshare({ canvasId: variables.id });
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: canvasKeys.all() });
    },
  });

  return mutation;
}
