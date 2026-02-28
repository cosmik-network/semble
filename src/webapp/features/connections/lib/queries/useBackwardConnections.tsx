import { useSuspenseInfiniteQuery } from '@tanstack/react-query';
import { getBackwardConnectionsForUrl } from '../dal';
import { connectionKeys } from '../connectionKeys';

type ConnectionTypeEnum =
  | 'SUPPORTS'
  | 'OPPOSES'
  | 'ADDRESSES'
  | 'HELPFUL'
  | 'LEADS_TO'
  | 'RELATED'
  | 'SUPPLEMENT'
  | 'EXPLAINER';

interface Props {
  url: string;
  limit?: number;
  connectionTypes?: ConnectionTypeEnum[];
}

export default function useBackwardConnections(props: Props) {
  const limit = props?.limit ?? 16;

  const backwardConnections = useSuspenseInfiniteQuery({
    queryKey: connectionKeys.backwardForUrlInfinite(props.url, props.limit),
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
