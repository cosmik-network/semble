import { useSuspenseInfiniteQuery } from '@tanstack/react-query';
import { getConnectionsForUrl } from '../dal';
import { connectionKeys } from '../connectionKeys';
import { ConnectionType } from '@semble/types';

interface Props {
  url: string;
  limit?: number;
  connectionTypes?: ConnectionType[];
}

export default function useAllConnections(props: Props) {
  const limit = props?.limit ?? 16;

  const allConnections = useSuspenseInfiniteQuery({
    queryKey: connectionKeys.allForUrlInfinite(
      props.url,
      props.limit,
      props.connectionTypes,
    ),
    initialPageParam: 1,
    queryFn: ({ pageParam = 1 }) => {
      return getConnectionsForUrl({
        url: props.url,
        direction: 'both',
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

  return allConnections;
}
