import { useQuery } from '@tanstack/react-query';
import { createSembleClient } from '@/services/client.apiClient';
import { canvasKeys } from '../canvasKeys';

// The share token lives only on the server; sharing again returns the
// existing one, so a shared board's link can be shown any time
export default function useShareToken(canvasId: string, shared: boolean) {
  return useQuery({
    queryKey: canvasKeys.shareToken(canvasId),
    queryFn: () => createSembleClient().canvas.share({ canvasId }),
    enabled: shared,
  });
}
