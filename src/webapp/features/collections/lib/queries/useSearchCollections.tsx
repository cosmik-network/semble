import { useSuspenseInfiniteQuery } from '@tanstack/react-query';
import { searchCollections } from '../dal';
import { collectionKeys } from '../collectionKeys';
import { CollectionSortField } from '@semble/types';

interface Props {
  searchText: string;
  limit?: number;
  sortBy?: CollectionSortField;
}

export default function useSearchCollections(props: Props) {
  const limit = props?.limit ?? 15;

  return useSuspenseInfiniteQuery({
    queryKey: collectionKeys.search(
      props.searchText,
      props.limit,
      props.sortBy,
    ),
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      searchCollections({
        searchText: props.searchText,
        limit,
        page: pageParam,
        collectionSortBy: props.sortBy,
      }),
    getNextPageParam: (lastPage) => {
      return lastPage.pagination.hasMore
        ? lastPage.pagination.currentPage + 1
        : undefined;
    },
  });
}
