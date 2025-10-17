import { useSuspenseInfiniteQuery } from '@tanstack/react-query';
import { getNoteCardsForUrl } from '../dal';

interface Props {
  url: string;
  limit?: number;
}

export default function useSembleNotes(props: Props) {
  const limit = props?.limit ?? 16;

  const notes = useSuspenseInfiniteQuery({
    queryKey: ['semble notes', props.url, limit],
    initialPageParam: 1,
    queryFn: ({ pageParam = 1 }) => {
      return getNoteCardsForUrl(props.url, { page: pageParam, limit });
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.hasMore) {
        return lastPage.pagination.currentPage + 1;
      }
      return undefined;
    },
  });

  return notes;
}
