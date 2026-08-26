import { useSuspenseInfiniteQuery } from '@tanstack/react-query';
import { getBskyFollowedUsers } from '../dal';
import { followKeys } from '../followKeys';

interface Props {
  limit: number;
}

/** Suspense twin of useBskyFollowedUsers. */
export default function useSuspenseBskyFollowedUsers(props: Props) {
  const limit = props.limit;

  return useSuspenseInfiniteQuery({
    queryKey: followKeys.bskyFollowedUsers(limit),
    initialPageParam: 1,
    queryFn: async ({ pageParam = 1 }) => {
      const response = await getBskyFollowedUsers({ limit, page: pageParam });
      return {
        ...response,
        users: (response.users ?? []).map((user) => ({
          ...user,
          followsOnBsky: true,
        })),
      };
    },
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasMore
        ? lastPage.pagination.currentPage + 1
        : undefined,
  });
}
