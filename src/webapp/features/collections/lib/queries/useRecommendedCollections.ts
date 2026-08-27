import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getRecommendedCollections } from '../dal';
import { collectionKeys } from '../collectionKeys';

interface Props {
  /** Undefined while the caller is still resolving them. The endpoint rejects
   * an empty list from an authenticated caller, so the query waits for one. */
  urls: string[] | undefined;
  enabled?: boolean;
}

export default function useRecommendedCollections(props: Props) {
  const enabled = props.enabled ?? true;
  const urls = props.urls ?? [];
  const hasSeeds = urls.length > 0;

  const query = useQuery({
    queryKey: collectionKeys.recommended(urls),
    queryFn: () => getRecommendedCollections(urls),
    enabled: enabled && hasSeeds,
    placeholderData: keepPreviousData,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  return {
    ...query,
    // A query held back for want of seeds reports `pending` forever. That's an
    // answer, not a load — only a caller still resolving seeds is waiting.
    isPending:
      enabled && (props.urls === undefined || (hasSeeds && query.isPending)),
  };
}
