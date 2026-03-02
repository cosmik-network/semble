import { useSuspenseInfiniteQuery } from '@tanstack/react-query';
import { getBackwardConnectionsForUrl } from '../dal';
import { connectionKeys } from '../connectionKeys';
import { ConnectionType } from '@semble/types';

interface Props {
  url: string;
  limit?: number;
  connectionTypes?: ConnectionType[];
}

export default function useBackwardConnections(props: Props) {
  const limit = props?.limit ?? 16;

  const backwardConnections = useSuspenseInfiniteQuery({
    queryKey: connectionKeys.backwardForUrlInfinite(props.url, props.limit, props.connectionTypes),
    initialPageParam: 1,
    queryFn: ({ pageParam = 1 }) => {
      return getBackwardConnectionsForUrl({
        url: props.url,
        page: pageParam,
        limit,
        connectionTypes: props.connectionTypes,
      });
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.hasMore) {
        return lastPage.pagination.currentPage + 1;
      }
      return undefined;
    },
  });

  return backwardConnections;
}
