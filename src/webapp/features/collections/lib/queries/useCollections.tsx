import { useSuspenseInfiniteQuery } from '@tanstack/react-query';
import { getCollections } from '../dal';
import { collectionKeys } from '../collectionKeys';
import { CollectionSortField } from '@semble/types';

interface Props {
  didOrHandle: string;
  limit?: number;
  sortBy?: CollectionSortField;
  query?: string;
}

export default function useCollections(props: Props) {
  const limit = props?.limit ?? 15;

  return useSuspenseInfiniteQuery({
    queryKey: collectionKeys.infinite(
      props.didOrHandle,
      props.limit,
      props?.sortBy,
      props.query,
    ),
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      getCollections(props.didOrHandle, {
        limit,
        page: pageParam,
        collectionSortBy: props.sortBy,
        query: props?.query,
      }),
    getNextPageParam: (lastPage) => {
      return lastPage.pagination.hasMore
        ? lastPage.pagination.currentPage + 1
        : undefined;
    },
  });
}
