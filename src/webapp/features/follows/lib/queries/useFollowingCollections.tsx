import { useSuspenseInfiniteQuery } from '@tanstack/react-query';
import { getFollowingCollections } from '../dal';
import { followKeys } from '../followKeys';

interface Props {
  identifier: string;
  limit?: number;
}

export default function useFollowingCollections({
  identifier,
  limit = 20,
}: Props) {
  const query = useSuspenseInfiniteQuery({
    queryKey: followKeys.followingCollections(identifier, limit),
    initialPageParam: 1,
    queryFn: ({ pageParam = 1 }) => {
      return getFollowingCollections(identifier, {
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
