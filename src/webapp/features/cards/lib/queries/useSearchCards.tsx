import { useInfiniteQuery } from '@tanstack/react-query';
import { CardSortField, SortOrder, UrlType } from '@semble/types';
import { searchUrls } from '@/features/connections/lib/dal';
import { cardKeys } from '../cardKeys';
import { getCardsSortParams } from '../utils';

interface Props {
  searchQuery: string;
  limit?: number;
  sortBy?: CardSortField;
  sortOrder?: SortOrder;
  urlType?: UrlType;
  enabled?: boolean;
}

export default function useSearchCards(props: Props) {
  const limit = props.limit ?? 20;

  return useInfiniteQuery({
    queryKey: cardKeys.searchResultsInfinite(
      props.searchQuery,
      limit,
      props.sortBy,
      props.sortOrder,
      props.urlType,
    ),
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      searchUrls({
        searchQuery: props.searchQuery,
        page: pageParam as number,
        limit,
        sortBy: props.sortBy,
        // An explicit order wins; otherwise use the direction the field's
        // label promises (Oldest is ascending, the rest descending).
        sortOrder:
          props.sortOrder ??
          (props.sortBy
            ? getCardsSortParams(props.sortBy).sortOrder
            : undefined),
        urlType: props.urlType,
      }),
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasMore
        ? lastPage.pagination.currentPage + 1
        : undefined,
    // The endpoint 400s on an empty query — there is no browse-all path.
    enabled: props.enabled !== false && props.searchQuery.trim().length > 0,
  });
}
