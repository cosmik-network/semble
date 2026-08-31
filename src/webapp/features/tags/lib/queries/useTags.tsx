import { useQuery } from '@tanstack/react-query';
import { getTags } from '../dal';
import { tagKeys } from '../tagKeys';

interface Props {
  q?: string;
  limit?: number;
  enabled?: boolean;
}

export default function useTags(props?: Props) {
  return useQuery({
    queryKey: tagKeys.list(props?.q, props?.limit),
    queryFn: () => getTags({ q: props?.q, limit: props?.limit }),
    enabled: props?.enabled ?? true,
    staleTime: 30_000,
  });
}
