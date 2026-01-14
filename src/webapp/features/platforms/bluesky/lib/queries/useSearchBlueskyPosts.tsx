import { useSuspenseInfiniteQuery } from '@tanstack/react-query';
import { blueskyKeys } from '../blueskyKeys';
import { searchBlueskyPosts } from '../dal';
import { BlueskySearchSortOptions } from '../types';

interface Props {
  query: string;
  limit?: number;
  sortBy?: BlueskySearchSortOptions;
}

export default function useSearchBlueskyPosts(props: Props) {
  const limit = props?.limit ?? 16;

  const posts = useSuspenseInfiniteQuery({
    queryKey: blueskyKeys.searchPosts(props.query, limit, props.sortBy),
    initialPageParam: '',
    queryFn: ({ pageParam = '' }) => {
      return searchBlueskyPosts({
        searchText: props.query,
        limit: limit,
        page: pageParam,
        sortBy: props.sortBy,
      });
    },
    getNextPageParam: (lastPage) => lastPage.cursor,
  });

  return posts;
}
