import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { canvasStorage } from '../../storage/browserCanvasStorage';
import { canvasKeys } from '../canvasKeys';

// Storage doesn't go through the mutations alone (saves come from the board),
// so canvas queries refetch whenever it reports a change
export default function useStorageChanges() {
  const queryClient = useQueryClient();

  useEffect(
    () =>
      canvasStorage.subscribe(() =>
        queryClient.invalidateQueries({ queryKey: canvasKeys.all() }),
      ),
    [queryClient],
  );
}
