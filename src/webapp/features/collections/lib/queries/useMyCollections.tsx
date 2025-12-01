import { useSuspenseInfiniteQuery } from '@tanstack/react-query';
import { getMyCollections } from '../dal';
import { collectionKeys } from '../collectionKeys';
import { CollectionSortField } from '@semble/types';

interface Props {
  limit?: number;
  sortBy?: CollectionSortField;
  query?: string;
}

export default function useMyCollections(props?: Props) {
  const limit = props?.limit ?? 15;

  return useSuspenseInfiniteQuery({
    queryKey: collectionKeys.mine(props?.limit, props?.query),
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      getMyCollections({
        limit,
        page: pageParam,
        collectionSortBy: props?.sortBy,
      }),
    getNextPageParam: (lastPage) => {
      return lastPage.pagination.hasMore
        ? lastPage.pagination.currentPage + 1
        : undefined;
    },
  });
}
