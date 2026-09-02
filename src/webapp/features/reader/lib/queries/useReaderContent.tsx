import { useQuery } from '@tanstack/react-query';
import { getReaderContent } from '../dal';
import { readerKeys } from '../readerKeys';

interface Props {
  url: string;
  enabled?: boolean;
}

export default function useReaderContent(props: Props) {
  return useQuery({
    queryKey: readerKeys.content(props.url),
    queryFn: () => getReaderContent(props.url),
    enabled: props.enabled,
    retry: false,
  });
}
