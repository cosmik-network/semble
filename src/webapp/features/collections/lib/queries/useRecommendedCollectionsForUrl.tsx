import { useQuery } from '@tanstack/react-query';
import { getRecommendedCollectionsForUrl } from '../dal';
import { collectionKeys } from '../collectionKeys';

interface Props {
  url: string;
  limit?: number;
}

export default function useRecommendedCollectionsForUrl(props: Props) {
  return useQuery({
    queryKey: collectionKeys.recommendedForUrl(props.url, props.limit),
    queryFn: () =>
      getRecommendedCollectionsForUrl({
        url: props.url,
        limit: props.limit,
      }),
    enabled: !!props.url,
  });
}
