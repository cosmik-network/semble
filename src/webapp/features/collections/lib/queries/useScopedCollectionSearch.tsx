import type { SearchScope } from '@/features/search/lib/searchScope';
import useCollectionSearch from './useCollectionSearch';
import { useMyCollectionsInfinite } from './useMyCollections';
import useSearchCollections from './useSearchCollections';

const RESULTS = 8;

// The viewer's own collections, or those matching the query, theirs or anyone's,
// as many pages as have been loaded
export default function useScopedCollectionSearch(
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
  const seen = new Set<string>();
  const collections = (
    search.data?.pages.flatMap((page) => page.collections ?? []) ?? []
  ).filter(
    (collection) => !seen.has(collection.id) && !!seen.add(collection.id),
  );
  const isIdle = scope === 'everyone' && !query;
  return {
    collections: isIdle ? [] : collections,
    isPending: !isIdle && search.isPending,
    isFetching: search.isFetching,
    isError: search.isError,
    hasNextPage: !isIdle && search.hasNextPage,
    isFetchingNextPage: search.isFetchingNextPage,
    isFetchNextPageError: search.isFetchNextPageError,
    fetchNextPage: search.fetchNextPage,
  };
}
