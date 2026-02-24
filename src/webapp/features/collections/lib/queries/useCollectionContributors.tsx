import { useSuspenseInfiniteQuery } from '@tanstack/react-query';
import { getCollectionContributors } from '../dal';
import { collectionKeys } from '../collectionKeys';

interface Props {
  collectionId: string;
  limit?: number;
}

export default function useCollectionContributors({
  collectionId,
  limit = 20,
}: Props) {
  const query = useSuspenseInfiniteQuery({
    queryKey: [...collectionKeys.collection(collectionId), 'contributors', limit],
    initialPageParam: 1,
    queryFn: ({ pageParam = 1 }) => {
      return getCollectionContributors(collectionId, {
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
