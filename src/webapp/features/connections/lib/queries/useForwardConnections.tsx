import { useSuspenseInfiniteQuery } from '@tanstack/react-query';
import { getForwardConnectionsForUrl } from '../dal';
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

export default function useForwardConnections(props: Props) {
  const limit = props?.limit ?? 16;

  const forwardConnections = useSuspenseInfiniteQuery({
    queryKey: connectionKeys.forwardForUrlInfinite(props.url, props.limit),
    initialPageParam: 1,
    queryFn: ({ pageParam = 1 }) => {
      return getForwardConnectionsForUrl({
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

  return forwardConnections;
}
