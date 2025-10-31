import { useSuspenseInfiniteQuery } from '@tanstack/react-query';
import { getCollectionsForUrl } from '../dal';
import { collectionKeys } from '../collectionKeys';

interface Props {
  url: string;
  limit?: number;
}

export default function useSembleCollections(props: Props) {
  const limit = props?.limit ?? 16;

  const collections = useSuspenseInfiniteQuery({
    queryKey: collectionKeys.bySembleUrl(props.url),
    initialPageParam: 1,
    queryFn: ({ pageParam = 1 }) => {
      return getCollectionsForUrl(props.url, { page: pageParam, limit });
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.hasMore) {
        return lastPage.pagination.currentPage + 1;
      }
      return undefined;
    },
  });

  return collections;
}
