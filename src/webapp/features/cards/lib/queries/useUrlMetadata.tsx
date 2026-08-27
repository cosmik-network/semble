import { useSuspenseQuery, useQuery } from '@tanstack/react-query';
import { getUrlMetadata } from '../dal';
import { cardKeys } from '../cardKeys';

// Deliberately no way to seed this query. It holds a URL's authoritative full
// stats — the semble and collection tabs read noteCount and collectionCount
// from it — and a caller that knows only part of that would have to invent the
// rest. Partial knowledge belongs in cardKeys.urlStatus instead.
interface PropsWithStats {
  url: string;
  includeStats: true;
}

interface PropsWithoutStats {
  url: string;
  includeStats?: false;
}

type Props = PropsWithStats | PropsWithoutStats;

export default function useUrlMetadata(props: Props) {
  if (props.includeStats) {
    // Non-suspense: stats are progressive — tabs render immediately, counts fill in async
    return useQuery({
      queryKey: cardKeys.urlMetadata(props.url, { includeStats: true }),
      queryFn: () => getUrlMetadata({ url: props.url, includeStats: true }),
    });
  }

  return useSuspenseQuery({
    queryKey: cardKeys.urlMetadata(props.url, {
      includeStats: props.includeStats,
    }),
    queryFn: () =>
      getUrlMetadata({ url: props.url, includeStats: props.includeStats }),
  });
}
