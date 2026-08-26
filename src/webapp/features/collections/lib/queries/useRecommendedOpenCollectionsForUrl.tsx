import { useQuery } from '@tanstack/react-query';
import { getRecommendedOpenCollectionsForUrl } from '../dal';
import { collectionKeys } from '../collectionKeys';

interface Props {
  url: string;
  limit?: number;
}

export default function useRecommendedOpenCollectionsForUrl(props: Props) {
  return useQuery({
    queryKey: collectionKeys.recommendedOpenForUrl(props.url, props.limit),
    queryFn: () =>
      getRecommendedOpenCollectionsForUrl({
        url: props.url,
        limit: props.limit,
      }),
    enabled: !!props.url,
  });
}
