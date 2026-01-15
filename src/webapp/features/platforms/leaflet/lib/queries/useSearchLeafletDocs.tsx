import { useSuspenseInfiniteQuery } from '@tanstack/react-query';
import { leafletKeys } from '../leafletKeys';
import { searchLeafletDocs } from '../dal';

interface Props {
  url: string;
  limit?: number;
}

export default function useSearchLeafletDocs(props: Props) {
  const limit = props?.limit ?? 16;

  const docs = useSuspenseInfiniteQuery({
    queryKey: leafletKeys.searchDocs(props.url, limit),
    initialPageParam: '',
    queryFn: ({ pageParam = '' }) => {
      return searchLeafletDocs({
        url: props.url,
        limit: limit,
        cursor: pageParam,
      });
    },
    getNextPageParam: (lastPage) => lastPage.cursor,
  });

  return docs;
}
