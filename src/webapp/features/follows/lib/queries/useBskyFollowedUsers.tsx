import { useInfiniteQuery } from '@tanstack/react-query';
import { getBskyFollowedUsers } from '../dal';
import { followKeys } from '../followKeys';

interface Props {
  limit?: number;
  enabled?: boolean;
}

export default function useBskyFollowedUsers({
  limit = 20,
  enabled = true,
}: Props = {}) {
  const query = useInfiniteQuery({
    queryKey: followKeys.bskyFollowedUsers(limit),
    enabled,
    initialPageParam: 1,
    queryFn: ({ pageParam = 1 }) => {
      return getBskyFollowedUsers({
        limit,
        page: pageParam,
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
