import { useQuery } from '@tanstack/react-query';
import { collectionKeys } from '@/features/collections/lib/collectionKeys';
import { getCollectionPageByAtUri } from '@/features/collections/lib/dal';

interface Props {
  handle: string | undefined;
  rkey: string | undefined;
  enabled?: boolean;
}

/**
 * Fetches collection metadata for graph node popups
 * Only fetches first page with limit=1 to get collection info without loading many cards
 */
export default function useGraphNodeCollection({
  handle,
  rkey,
  enabled = true,
}: Props) {
  return useQuery({
    queryKey:
      handle && rkey
        ? collectionKeys.infinite(undefined, 1, undefined, undefined, undefined)
        : ['graph', 'collection', 'empty'],
    queryFn: async () => {
      if (!handle || !rkey) throw new Error('Handle and rkey are required');
      const response = await getCollectionPageByAtUri({
        recordKey: rkey,
        handle,
        params: { limit: 1 }, // Only fetch 1 card to minimize data transfer
      });
      return response;
    },
    enabled: enabled && !!handle && !!rkey,
    staleTime: 5 * 60 * 1000, // 5 minutes - collections don't change often
    retry: 1, // Only retry once for popup data
    refetchOnWindowFocus: false, // Don't refetch on focus for popup data
  });
}
