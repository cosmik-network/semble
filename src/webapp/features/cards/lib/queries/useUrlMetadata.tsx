import { useSuspenseQuery, useQuery } from '@tanstack/react-query';
import { getUrlMetadata } from '../dal';
import type { UrlAggregateStats } from '@semble/types';
import { cardKeys } from '../cardKeys';

interface PropsWithStats {
  url: string;
  includeStats: true;
  initialData?: { stats?: UrlAggregateStats };
}

interface PropsWithoutStats {
  url: string;
  includeStats?: false;
}

type Props = PropsWithStats | PropsWithoutStats;

export default function useUrlMetadata(props: Props) {
  // Use regular useQuery when we have initialData (with stats)
  // Use useSuspenseQuery for basic metadata queries without stats
  if (props.includeStats && 'initialData' in props) {
    return useQuery({
      queryKey: cardKeys.urlMetadata(props.url, { includeStats: true }),
      queryFn: () => getUrlMetadata({ url: props.url, includeStats: true }),
      initialData: props.initialData,
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
