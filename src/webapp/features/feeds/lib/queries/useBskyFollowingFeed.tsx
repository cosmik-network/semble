import { useInfiniteQuery } from '@tanstack/react-query';
import { getBskyFollowingFeed } from '../dal';
import { feedKeys } from '../feedKeys';
import { UrlType, ActivitySource, ActivityType } from '@semble/types';

interface Props {
  limit?: number;
  urlType?: UrlType;
  source?: ActivitySource;
  activityTypes?: ActivityType[];
  includeKnownBots?: boolean;
  enabled?: boolean;
  /** DID or handle whose follows define the feed; omitted for your own. */
  identifier?: string;
}

export default function useBskyFollowingFeed(props?: Props) {
  const limit = props?.limit ?? 15;
  const enabled = props?.enabled ?? true;

  const query = useInfiniteQuery({
    queryKey: feedKeys.bskyFollowingInfinite(
      limit,
      props?.urlType,
      props?.source,
      props?.activityTypes,
      props?.includeKnownBots,
      props?.identifier,
    ),
    staleTime: 10000,
    initialPageParam: 1,
    enabled,
    queryFn: ({ pageParam = 1 }) => {
      return getBskyFollowingFeed({
        identifier: props?.identifier,
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
