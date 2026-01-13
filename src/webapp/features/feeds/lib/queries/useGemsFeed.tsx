import { useSuspenseInfiniteQuery } from '@tanstack/react-query';
import { getGemsActivityFeed } from '../dal';
import { feedKeys } from '../feedKeys';
import { UrlType } from '@semble/types';

interface Props {
  limit?: number;
  urlType?: UrlType;
}

export default function useGemsFeed(props?: Props) {
  const limit = props?.limit ?? 15;

  const query = useSuspenseInfiniteQuery({
    queryKey: feedKeys.gemsInfinite(limit, props?.urlType),
    staleTime: 10000,
    initialPageParam: 1,
    refetchOnWindowFocus: false,
    queryFn: ({ pageParam = 1 }) => {
      return getGemsActivityFeed({
        limit,
        page: pageParam,
        urlType: props?.urlType,
      });
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.hasMore) {
        return lastPage.pagination.currentPage + 1;
      }
      return undefined;
    },
  });

  return query;
}
