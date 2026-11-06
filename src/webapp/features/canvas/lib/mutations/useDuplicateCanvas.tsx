import { useMutation, useQueryClient } from '@tanstack/react-query';
import { canvasStorage } from '../../storage/browserCanvasStorage';
import { canvasKeys } from '../canvasKeys';

export default function useDuplicateCanvas() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (id: string) => {
      return canvasStorage.duplicateCanvas(id);
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: canvasKeys.all() });
    },
  });

  return mutation;
}
