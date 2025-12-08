import { useSuspenseInfiniteQuery } from '@tanstack/react-query';
import { getSimilarUrlsForUrl } from '../dal';
import { sembleKeys } from '../sembleKeys';

interface Props {
  url: string;
  limit?: number;
  threshold?: number;
}

export default function useSembleSimilarCards(props: Props) {
  const limit = props?.limit ?? 16;

  const similarCards = useSuspenseInfiniteQuery({
    queryKey: sembleKeys.similarCardsInfinite(props.url, props.limit),
    initialPageParam: 1,
    queryFn: ({ pageParam = 1 }) => {
      return getSimilarUrlsForUrl(props.url, {
        page: pageParam,
        limit,
        ...(props.threshold && { threshold: props.threshold }),
      });
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.hasMore) {
        return lastPage.pagination.currentPage + 1;
      }
      return undefined;
    },
  });

  return similarCards;
}
