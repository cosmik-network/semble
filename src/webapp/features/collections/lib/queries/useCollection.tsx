import { useSuspenseInfiniteQuery } from '@tanstack/react-query';
import { getCollectionPageByAtUri } from '../dal';
import { collectionKeys } from '../collectionKeys';
import { CardSortField, SortOrder } from '@semble/types';

interface Props {
  rkey: string;
  handle: string;
  limit?: number;
  sortBy?: CardSortField;
  sortOrder?: SortOrder;
}

export default function useCollection(props: Props) {
  const limit = props.limit ?? 20;

  return useSuspenseInfiniteQuery({
    queryKey: collectionKeys.infinite(props.rkey, props.limit, props.sortBy, props.sortOrder),
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      getCollectionPageByAtUri({
        recordKey: props.rkey,
        handle: props.handle,
        params: { limit, page: pageParam, cardSortBy: props.sortBy, sortOrder: props.sortOrder },
      }),
    getNextPageParam: (lastPage) => {
      return lastPage.pagination.hasMore
        ? lastPage.pagination.currentPage + 1
        : undefined;
    },
  });
}
