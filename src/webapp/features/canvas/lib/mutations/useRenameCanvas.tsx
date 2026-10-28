import { useMutation, useQueryClient } from '@tanstack/react-query';
import { canvasStorage } from '../../storage/browserCanvasStorage';
import { canvasKeys } from '../canvasKeys';

export default function useRenameCanvas() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (variables: { id: string; name: string }) => {
      return canvasStorage.renameCanvas(variables.id, variables.name);
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: canvasKeys.all() });
    },
  });

  return mutation;
}
