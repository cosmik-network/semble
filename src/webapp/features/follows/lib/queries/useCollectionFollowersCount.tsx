import { useSuspenseQuery } from '@tanstack/react-query';
import { getCollectionFollowersCount } from '../dal';
import { followKeys } from '../followKeys';

interface Props {
  collectionId: string;
}

export default function useCollectionFollowersCount({ collectionId }: Props) {
  const query = useSuspenseQuery({
    queryKey: followKeys.collectionFollowersCount(collectionId),
    queryFn: () => getCollectionFollowersCount(collectionId),
    staleTime: 10000,
    refetchOnWindowFocus: false,
  });

  return query;
}
