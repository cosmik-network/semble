import { useSuspenseInfiniteQuery } from '@tanstack/react-query';
import { getFollowingUsers } from '../dal';
import { followKeys } from '../followKeys';

interface Props {
  identifier: string;
  limit?: number;
}

export default function useFollowingUsers({ identifier, limit = 20 }: Props) {
  const query = useSuspenseInfiniteQuery({
    queryKey: followKeys.followingUsers(identifier, limit),
    initialPageParam: 1,
    queryFn: ({ pageParam = 1 }) => {
      return getFollowingUsers(identifier, {
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
