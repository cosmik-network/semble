import { useSuspenseQuery } from '@tanstack/react-query';
import { getFollowingCount } from '../dal';
import { followKeys } from '../followKeys';

interface Props {
  identifier: string;
}

export default function useFollowingCount({ identifier }: Props) {
  const query = useSuspenseQuery({
    queryKey: followKeys.followingCount(identifier),
    queryFn: () => getFollowingCount(identifier),
    staleTime: 10000,
    refetchOnWindowFocus: false,
  });

  return query;
}
