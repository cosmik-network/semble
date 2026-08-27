import { useSuspenseInfiniteQuery } from '@tanstack/react-query';
import { TaggedItemType } from '@semble/types';
import { getTaggedItems } from '../dal';
import { tagKeys } from '../tagKeys';

interface Props {
  tag: string;
  /** Absent → blended list across all item types. */
  itemType?: TaggedItemType;
  user?: string;
  limit?: number;
}

export default function useTaggedItems(props: Props) {
  const limit = props.limit ?? 16;

  return useSuspenseInfiniteQuery({
    queryKey: tagKeys.itemsInfinite(
      props.tag,
      props.itemType ?? 'all',
      props.user,
      limit,
    ),
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      getTaggedItems({
        tag: props.tag,
        itemType: props.itemType,
        user: props.user,
        page: pageParam,
        limit,
      }),
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.hasMore) {
        return lastPage.pagination.currentPage + 1;
      }
      return undefined;
    },
  });
}
