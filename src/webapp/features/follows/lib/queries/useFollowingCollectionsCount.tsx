import { useSuspenseQuery } from '@tanstack/react-query';
import { getFollowingCollectionsCount } from '../dal';
import { followKeys } from '../followKeys';

interface Props {
  identifier: string;
}

export default function useFollowingCollectionsCount({ identifier }: Props) {
  const query = useSuspenseQuery({
    queryKey: followKeys.followingCollectionsCount(identifier),
    queryFn: () => getFollowingCollectionsCount(identifier),
    staleTime: 10000,
    refetchOnWindowFocus: false,
  });

  return query;
}
