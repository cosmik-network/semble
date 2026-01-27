import { useInfiniteQuery } from '@tanstack/react-query';
import { getOpenCollectionsWithContributor } from '../dal';
import { collectionKeys } from '../collectionKeys';
import { CollectionSortField, GetCollectionsResponse } from '@semble/types';

interface Props {
  identifier: string;
  limit?: number;
  sortBy?: CollectionSortField;
  enabled?: boolean;
}

export default function useOpenCollectionsWithContributor(props: Props) {
  const limit = props?.limit ?? 10;

  return useInfiniteQuery<GetCollectionsResponse>({
    queryKey: [
      ...collectionKeys.all(),
      'openWithContributor',
      props.identifier,
      props.limit,
      props.sortBy,
    ],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      getOpenCollectionsWithContributor({
        identifier: props.identifier,
        limit,
        page: pageParam as number,
        collectionSortBy: props.sortBy,
      }),
    getNextPageParam: (lastPage) => {
      return lastPage.pagination.hasMore
        ? lastPage.pagination.currentPage + 1
        : undefined;
    },
    enabled: props.enabled !== false && !!props.identifier,
  });
}
