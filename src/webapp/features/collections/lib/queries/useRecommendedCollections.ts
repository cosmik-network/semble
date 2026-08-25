import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getRecommendedCollections } from '../dal';
import { collectionKeys } from '../collectionKeys';

interface Props {
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
