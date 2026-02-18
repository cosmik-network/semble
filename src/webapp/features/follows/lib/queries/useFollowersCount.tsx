import { useSuspenseQuery } from '@tanstack/react-query';
import { getFollowersCount } from '../dal';
import { followKeys } from '../followKeys';

interface Props {
  identifier: string;
}

export default function useFollowersCount({ identifier }: Props) {
  const query = useSuspenseQuery({
    queryKey: followKeys.followersCount(identifier),
    queryFn: () => getFollowersCount(identifier),
    staleTime: 10000,
    refetchOnWindowFocus: false,
  });

  return query;
}
