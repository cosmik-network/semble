import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getRecommendedUsers } from '../dal';
import { profileKeys } from '../profileKeys';

interface Props {
  urls: string[];
  enabled?: boolean;
}

export default function useRecommendedUsers(props: Props) {
  return useQuery({
    queryKey: profileKeys.recommended(props.urls),
    queryFn: () => getRecommendedUsers(props.urls),
    enabled: (props.enabled ?? true) && props.urls.length > 0,
    // Keep the current list on screen while a new set loads.
    placeholderData: keepPreviousData,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}
