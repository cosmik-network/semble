import { useSuspenseInfiniteQuery } from '@tanstack/react-query';
import { getGlobalFeed } from '../dal';
import { feedKeys } from '../feedKeys';

interface Props {
  limit?: number;
}

export default function useGlobalFeed(props?: Props) {
  const limit = props?.limit ?? 15;

  const query = useSuspenseInfiniteQuery({
    queryKey: feedKeys.infinite(limit),
    staleTime: 10000,
    initialPageParam: 1,
    refetchOnWindowFocus: false,
    queryFn: ({ pageParam = 1 }) => {
      return getGlobalFeed({ limit, page: pageParam });
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
