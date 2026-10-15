import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { semanticSearchUrls } from '../dal';
import { searchKeys } from '../searchKeys';
import { UrlType } from '@semble/types';

export const MIN_PREVIEW_QUERY_LENGTH = 2;

interface Props {
  query: string;
  limit?: number;
  urlType?: UrlType;
}

export default function useSemanticSearchPreview(props: Props) {
  const limit = props.limit ?? 10;

  return useQuery({
    queryKey: searchKeys.semanticSearchPreview(
      props.query,
      limit,
      props.urlType,
    ),
    queryFn: () =>
      semanticSearchUrls(props.query, { limit, urlType: props.urlType }),
    enabled: props.query.trim().length >= MIN_PREVIEW_QUERY_LENGTH,
    placeholderData: keepPreviousData,
  });
}
