import { useQuery } from '@tanstack/react-query';
import { getRecommendedUsers } from '../dal';
import { onboardingKeys } from '../onboardingKeys';

interface Props {
  urls: string[];
  enabled?: boolean;
}

export default function useRecommendedUsers(props: Props) {
  return useQuery({
    queryKey: onboardingKeys.recommendedUsers(props.urls),
    queryFn: () => getRecommendedUsers(props.urls),
    enabled: (props.enabled ?? true) && props.urls.length > 0,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}
