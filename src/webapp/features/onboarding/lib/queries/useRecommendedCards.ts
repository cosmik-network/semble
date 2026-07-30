import { useQuery } from '@tanstack/react-query';
import { getRecommendedUrls } from '../dal';
import { onboardingKeys } from '../onboardingKeys';

interface Props {
  queries: string[];
  enabled?: boolean;
}

export default function useRecommendedCards(props: Props) {
  return useQuery({
    queryKey: onboardingKeys.recommendedCards(props.queries),
    queryFn: () => getRecommendedUrls(props.queries),
    enabled: (props.enabled ?? true) && props.queries.length > 0,
    // Results are intentionally randomized server-side; don't reshuffle on refocus
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}
