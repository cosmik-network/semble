import { useSuspenseInfiniteQuery } from '@tanstack/react-query';
import { getCollectionFollowers } from '../dal';
import { followKeys } from '../followKeys';

interface Props {
  collectionId: string;
  limit?: number;
}

export default function useCollectionFollowers({
  collectionId,
  limit = 20,
}: Props) {
  const query = useSuspenseInfiniteQuery({
    queryKey: followKeys.collectionFollowers(collectionId, limit),
    initialPageParam: 1,
    queryFn: ({ pageParam = 1 }) => {
      return getCollectionFollowers(collectionId, {
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
