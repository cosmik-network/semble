import { useSuspenseInfiniteQuery } from '@tanstack/react-query';
import { blueskyKeys } from '../blueskyKeys';
import { searchBlueskyPosts } from '../dal';

interface Props {
  query: string;
  limit?: number;
}

export default function useSearchBlueskyPosts(props: Props) {
  const limit = props?.limit ?? 16;

  const posts = useSuspenseInfiniteQuery({
    queryKey: blueskyKeys.searchPosts(props.query, limit),
    initialPageParam: '',
    queryFn: ({ pageParam = '' }) => {
      return searchBlueskyPosts({
        searchText: props.query,
        limit: limit,
        page: pageParam,
      });
    },
    getNextPageParam: (lastPage) => lastPage.cursor,
  });

  return posts;
}
