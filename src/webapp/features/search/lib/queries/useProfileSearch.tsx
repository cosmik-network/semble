import { useSuspenseInfiniteQuery } from '@tanstack/react-query';
import { searchAtProtoAccounts } from '../dal';
import { searchKeys } from '../searchKeys';

interface Props {
  query: string;
  limit?: number;
}

export default function useProfileSearch(props: Props) {
  const limit = props?.limit ?? 16;

  const searchResults = useSuspenseInfiniteQuery({
    queryKey: searchKeys.profileSearchInfinite(props.query, props.limit),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => {
      return searchAtProtoAccounts(props.query, {
        limit,
        cursor: pageParam,
      });
    },
    getNextPageParam: (lastPage) => {
      return lastPage.cursor;
    },
  });

  return searchResults;
}
