import {
  useInfiniteQuery,
  useSuspenseInfiniteQuery,
} from '@tanstack/react-query';
import { searchCollections } from '../dal';
import { collectionKeys } from '../collectionKeys';
import {
  CollectionSortField,
  CollectionAccessType,
  GetCollectionsResponse,
  SortOrder,
} from '@semble/types';
import { getCollectionsSortParams } from '../utils';
interface Props {
  searchText: string;
  limit?: number;
  sortBy?: CollectionSortField;
  accessType?: CollectionAccessType;
  identifier?: string;
  sortOrder?: SortOrder;
  enabled?: boolean;
}

export default function useSearchCollections(props: Props) {
  const limit = props?.limit ?? 16;

  return useInfiniteQuery<GetCollectionsResponse>({
    queryKey: collectionKeys.search(
      props.searchText,
      props.limit,
      props.sortBy,
      props.accessType,
      props.identifier,
      props.sortOrder,
    ),
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      searchCollections({
        searchText: props.searchText,
        limit,
        page: pageParam as number,
        collectionSortBy: props.sortBy,
        // An explicit order wins; otherwise fall back to the sensible default
        // for the field (ascending for name, descending for the rest).
        sortOrder:
          props.sortOrder ??
          (props.sortBy
            ? getCollectionsSortParams(props.sortBy).sortOrder
            : undefined),
        accessType: props.accessType,
        identifier: props.identifier,
      }),
    getNextPageParam: (lastPage) => {
      return lastPage.pagination.hasMore
        ? lastPage.pagination.currentPage + 1
        : undefined;
    },
    enabled: props.enabled !== false,
  });
}
