import { useMutation, useQueryClient } from '@tanstack/react-query';
import { canvasStorage } from '../../storage/browserCanvasStorage';
import { canvasKeys } from '../canvasKeys';

export default function useDeleteCanvas() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (id: string) => {
      return canvasStorage.deleteCanvas(id);
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: canvasKeys.all() });
    },
  });

  return mutation;
}
