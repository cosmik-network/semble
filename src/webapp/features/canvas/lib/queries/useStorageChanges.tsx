import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { canvasStorage } from '../../storage/browserCanvasStorage';
import { canvasKeys } from '../canvasKeys';

// Shared by every mounted hook, so a change invalidates once
const subscriptions = new WeakMap<
  QueryClient,
  { hooks: number; unsubscribe: () => void }
>();

// Storage doesn't go through the mutations alone (saves come from the board),
// so canvas queries refetch whenever it reports a change
export default function useStorageChanges() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let subscription = subscriptions.get(queryClient);
    if (!subscription) {
      subscription = {
        hooks: 0,
        unsubscribe: canvasStorage.subscribe(() =>
          queryClient.invalidateQueries({ queryKey: canvasKeys.all() }),
        ),
      };
      subscriptions.set(queryClient, subscription);
    }
    const shared = subscription;
    shared.hooks++;
    return () => {
      if (--shared.hooks > 0) return;
      shared.unsubscribe();
      subscriptions.delete(queryClient);
    };
  }, [queryClient]);
}
