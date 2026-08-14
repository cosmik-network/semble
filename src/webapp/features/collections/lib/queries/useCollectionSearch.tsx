import { useInfiniteQuery } from '@tanstack/react-query';
import { getMyCollections } from '../dal';
import { collectionKeys } from '../collectionKeys';
import { CollectionSortField } from '@semble/types';
import { getCollectionsSortParams } from '../utils';

interface Props {
  query: string;
  params?: {
    limit?: number;
  };
}

export default function useCollectionSearch(props: Props) {
  const limit = props.params?.limit ?? 10;

  const collections = useInfiniteQuery({
    queryKey: collectionKeys.search(props.query, limit),
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      getMyCollections({
        limit,
        page: pageParam,
        ...getCollectionsSortParams(CollectionSortField.UPDATED_AT),
        searchText: props.query || undefined,
      }),
    getNextPageParam: (lastPage) => {
      return lastPage.pagination.hasMore
        ? lastPage.pagination.currentPage + 1
        : undefined;
    },
    enabled: !!props.query,
  });

  return collections;
}
