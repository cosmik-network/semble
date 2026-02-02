import { useSuspenseInfiniteQuery } from '@tanstack/react-query';
import { getGemsActivityFeed } from '../dal';
import { feedKeys } from '../feedKeys';
import { UrlType, ActivitySource } from '@semble/types';

interface Props {
  limit?: number;
  urlType?: UrlType;
  source?: ActivitySource;
}

export default function useGemsFeed(props?: Props) {
  const limit = props?.limit ?? 15;

  const query = useSuspenseInfiniteQuery({
    queryKey: feedKeys.gemsInfinite(limit, props?.urlType, props?.source),
    staleTime: 10000,
    initialPageParam: 1,
    refetchOnWindowFocus: false,
    queryFn: ({ pageParam = 1 }) => {
      return getGemsActivityFeed({
        limit,
        page: pageParam,
        urlType: props?.urlType,
        source: props?.source,
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
