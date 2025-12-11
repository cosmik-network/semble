import { useSuspenseInfiniteQuery } from '@tanstack/react-query';
import { getMyNotifications } from '../dal';
import { notificationKeys } from '../notificationKeys';

interface Props {
  limit?: number;
  unreadOnly?: boolean;
}

export default function useMyNotifications(props?: Props) {
  const limit = props?.limit ?? 15;
  const unreadOnly = props?.unreadOnly ?? false;

  const query = useSuspenseInfiniteQuery({
    queryKey: notificationKeys.infinite(limit),
    staleTime: 10000,
    initialPageParam: 1,
    refetchOnWindowFocus: false,
    queryFn: ({ pageParam = 1 }) => {
      return getMyNotifications({ limit, page: pageParam, unreadOnly });
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
