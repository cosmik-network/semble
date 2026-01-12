import { useSuspenseInfiniteQuery } from '@tanstack/react-query';
import { semanticSearchUrls } from '../dal';
import { searchKeys } from '../searchKeys';

interface Props {
  query: string;
  limit?: number;
  threshold?: number;
  urlType?: string;
  userId?: string;
}

export default function useSemanticSearch(props: Props) {
  const limit = props?.limit ?? 16;

  const searchResults = useSuspenseInfiniteQuery({
    queryKey: searchKeys.semanticSearchInfinite(props.query, props.limit),
    initialPageParam: 1,
    queryFn: ({ pageParam = 1 }) => {
      return semanticSearchUrls(props.query, {
        page: pageParam,
        limit,
        ...(props.threshold && { threshold: props.threshold }),
        ...(props.urlType && { urlType: props.urlType }),
        ...(props.userId && { userId: props.userId }),
      });
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.hasMore) {
        return lastPage.pagination.currentPage + 1;
      }
      return undefined;
    },
  });

  return searchResults;
}
