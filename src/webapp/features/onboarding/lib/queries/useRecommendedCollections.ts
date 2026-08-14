import { useQuery } from '@tanstack/react-query';
import { getRecommendedCollections } from '../dal';
import { onboardingKeys } from '../onboardingKeys';

interface Props {
  urls: string[];
  enabled?: boolean;
}

export default function useRecommendedCollections(props: Props) {
  return useQuery({
    queryKey: onboardingKeys.recommendedCollections(props.urls),
    queryFn: () => getRecommendedCollections(props.urls),
    enabled: (props.enabled ?? true) && props.urls.length > 0,
    // Randomized server-side, so a refetch reshuffles what is on screen.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}
