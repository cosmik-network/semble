import { useSuspenseQuery } from '@tanstack/react-query';
import { getRecommendedUsers } from '../dal';
import { profileKeys } from '../profileKeys';

interface Props {
  urls: string[];
}

/** Suspense twin of useRecommendedUsers. */
export default function useSuspenseRecommendedUsers(props: Props) {
  return useSuspenseQuery({
    queryKey: profileKeys.recommended(props.urls),
    queryFn: () => getRecommendedUsers(props.urls),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}
