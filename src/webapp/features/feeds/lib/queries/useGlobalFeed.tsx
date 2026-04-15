import { useSuspenseInfiniteQuery } from '@tanstack/react-query';
import { getGlobalFeed } from '../dal';
import { feedKeys } from '../feedKeys';
import { UrlType, ActivitySource, ActivityType } from '@semble/types';

interface Props {
  limit?: number;
  urlType?: UrlType;
  source?: ActivitySource;
  activityTypes?: ActivityType[];
  includeKnownBots?: boolean;
}

export default function useGlobalFeed(props?: Props) {
  const limit = props?.limit ?? 15;

  const query = useSuspenseInfiniteQuery({
    queryKey: feedKeys.infinite(
      limit,
      props?.urlType,
      props?.source,
      props?.activityTypes,
      props?.includeKnownBots,
    ),
    staleTime: 10000,
    initialPageParam: 1,
    refetchOnWindowFocus: false,
    queryFn: ({ pageParam = 1 }) => {
      return getGlobalFeed({
        limit,
        page: pageParam,
        urlType: props?.urlType,
        source: props?.source,
        activityTypes: props?.activityTypes,
        includeKnownBots: props?.includeKnownBots,
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
