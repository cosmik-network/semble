import useCollectionSearch from '@/features/collections/lib/queries/useCollectionSearch';
import { useMyCollectionsInfinite } from '@/features/collections/lib/queries/useMyCollections';
import useSearchCollections from '@/features/collections/lib/queries/useSearchCollections';
import type { SearchScope } from '../../server/canvasServer';

const RESULTS = 8;

// Collections to place from quick-add: the viewer's own, or
// those matching the query, theirs or anyone's
export default function useQuickAddCollections(
  scope: SearchScope,
  query: string,
  enabled: boolean,
) {
  // In the order the collection selector lists them, sharing its cache
  const recent = useMyCollectionsInfinite({
    enabled: enabled && scope === 'mine' && !query,
  });
  const mine = useCollectionSearch({
    query: enabled && scope === 'mine' ? query : '',
    keepPreviousData: true,
  });
  const everyone = useSearchCollections({
    searchText: query,
    limit: RESULTS,
    enabled: enabled && scope === 'everyone' && !!query,
    keepPreviousData: true,
  });
  const search = scope === 'everyone' ? everyone : query ? mine : recent;
  const collections =
    search.data?.pages.flatMap((page) => page.collections ?? []) ?? [];
  const isIdle = scope === 'everyone' && !query;
  return {
    collections: isIdle ? [] : collections.slice(0, RESULTS),
    isPending: !isIdle && search.isPending,
    isFetching: search.isFetching,
    isError: search.isError,
  };
}
