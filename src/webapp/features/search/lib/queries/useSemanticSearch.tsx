import { useSuspenseInfiniteQuery } from '@tanstack/react-query';
import { semanticSearchUrls } from '../dal';
import { searchKeys } from '../searchKeys';
import { UrlType } from '@semble/types';

interface Props {
  query: string;
  limit?: number;
  threshold?: number;
  userId?: string;
  urlType?: UrlType;
}

export default function useSemanticSearch(props: Props) {
  const limit = props?.limit ?? 16;

  const searchResults = useSuspenseInfiniteQuery({
    queryKey: searchKeys.semanticSearchInfinite(
      props.query,
      props.limit,
      props.threshold,
      props.urlType,
      props.userId,
    ),
    initialPageParam: 1,
    queryFn: ({ pageParam }) => {
      const { threshold, urlType, userId } = props;
      return semanticSearchUrls(props.query, {
        page: pageParam,
        limit,
        threshold,
        urlType,
        userId,
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
