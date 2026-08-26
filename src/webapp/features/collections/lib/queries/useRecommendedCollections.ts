import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getRecommendedCollections } from '../dal';
import { collectionKeys } from '../collectionKeys';

interface Props {
  // Seed URLs to recommend from. The endpoint rejects an empty list from an
  // authenticated caller, so the query stays disabled until there's at least
  // one — see useGlobalFeedSeeds for where seeds come from when the reader's
  // own library has none.
  urls: string[];
  enabled?: boolean;
}

export default function useRecommendedCollections(props: Props) {
  return useQuery({
    queryKey: collectionKeys.recommended(props.urls),
    queryFn: () => getRecommendedCollections(props.urls),
    enabled: (props.enabled ?? true) && props.urls.length > 0,
    // Keep the current list on screen while a new set loads.
    placeholderData: keepPreviousData,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}
