import { useSuspenseInfiniteQuery } from '@tanstack/react-query';
import { getUserConnections } from '../dal';
import { connectionKeys } from '../connectionKeys';
import { ConnectionType } from '@semble/types';

interface Props {
  identifier: string;
  limit?: number;
  connectionTypes?: ConnectionType[];
}

export default function useUserConnections(props: Props) {
  const limit = props?.limit ?? 16;

  const userConnections = useSuspenseInfiniteQuery({
    queryKey: connectionKeys.userConnectionsInfinite(
      props.identifier,
      props.limit,
      props.connectionTypes,
    ),
    initialPageParam: 1,
    queryFn: ({ pageParam = 1 }) => {
      return getUserConnections({
        identifier: props.identifier,
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

  return userConnections;
}
