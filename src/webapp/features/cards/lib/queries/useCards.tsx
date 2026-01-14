import { useSuspenseInfiniteQuery } from '@tanstack/react-query';
import { getUrlCards } from '../dal';
import { cardKeys } from '../cardKeys';
import { CardSortField, SortOrder, UrlType } from '@semble/types';

interface Props {
  didOrHandle: string;
  limit?: number;
  sortBy?: CardSortField;
  sortOrder?: SortOrder;
  urlType?: UrlType;
}

export default function useCards(props: Props) {
  const limit = props?.limit ?? 16;

  const cards = useSuspenseInfiniteQuery({
    queryKey: cardKeys.infinite(
      props.didOrHandle,
      props.limit,
      props.sortBy,
      props.sortOrder,
      props.urlType,
    ),
    initialPageParam: 1,
    queryFn: ({ pageParam = 1 }) => {
      return getUrlCards(props.didOrHandle, {
        limit,
        page: pageParam,
        cardSortBy: props.sortBy,
        cardSortOrder: props.sortOrder,
        urlType: props.urlType,
      });
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.hasMore) {
        return lastPage.pagination.currentPage + 1;
      }
      return undefined;
    },
  });

  return cards;
}
