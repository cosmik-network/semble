import { useQuery } from '@tanstack/react-query';
import { getMyGemCollections } from '../dal';
import { collectionKeys } from '../collectionKeys';
import { CollectionSortField } from '@semble/types';
import { getCollectionsSortParams } from '../utils';

export default function useGemCollectionSearch() {
  const QUERY = '💎';

  const gemCollections = useQuery({
    queryKey: collectionKeys.search(QUERY + 'gem'),
    queryFn: () =>
      getMyGemCollections({
        limit: 5,
        ...getCollectionsSortParams(CollectionSortField.UPDATED_AT),
        searchText: QUERY,
      }),
    enabled: !!QUERY,
  });

  return gemCollections;
}
