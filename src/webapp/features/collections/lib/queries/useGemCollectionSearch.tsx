import { useQuery } from '@tanstack/react-query';
import { getMyGemCollections } from '../dal';
import { collectionKeys } from '../collectionKeys';
import { SortOrder } from '@semble/types';

export default function useGemCollectionSearch() {
  const QUERY = '💎';

  const gemCollections = useQuery({
    queryKey: collectionKeys.search(QUERY + 'gem'),
    queryFn: () =>
      getMyGemCollections({
        limit: 5,
        sortBy: 'updatedAt',
        sortOrder: SortOrder.DESC,
        searchText: QUERY,
      }),
    enabled: !!QUERY,
  });

  return gemCollections;
}
