import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getRecommendedUsers } from '../dal';
import { profileKeys } from '../profileKeys';

interface Props {
  // Seed URLs to recommend from. The endpoint rejects an empty list from an
  // authenticated caller, so the query stays disabled until there's at least
  // one. Undefined, from a caller still resolving them, is the same story here:
  // nothing to ask for yet.
  urls: string[] | undefined;
  enabled?: boolean;
}

export default function useRecommendedUsers(props: Props) {
  const urls = props.urls ?? [];

  return useQuery({
    queryKey: profileKeys.recommended(urls),
    queryFn: () => getRecommendedUsers(urls),
    enabled: (props.enabled ?? true) && urls.length > 0,
    // Keep the current list on screen while a new set loads.
    placeholderData: keepPreviousData,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}
