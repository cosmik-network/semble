import { useQuery } from '@tanstack/react-query';
import { getUrlMetadata } from '../dal';
import { cardKeys } from '../cardKeys';

/**
 * What a card in a list shows about a URL: how many people saved or connected
 * it, and whether the reader is one of them.
 */
export interface UrlStatus {
  libraryCount: number;
  connectionCount: number;
  inLibrary?: boolean;
  isConnected?: boolean;
}

interface Props {
  url: string;
  /**
   * The values the surrounding list was rendered with. They seed the cache so
   * the card paints immediately and never refetches on mount; the save and
   * connect mutations invalidate the key when the reader acts on the URL.
   */
  initialData: UrlStatus;
}

export default function useUrlStatus(props: Props) {
  return useQuery({
    queryKey: cardKeys.urlStatus(props.url),
    queryFn: async (): Promise<UrlStatus> => {
      const data = await getUrlMetadata({
        url: props.url,
        includeStats: true,
      });

      return {
        libraryCount: data.stats?.libraryCount ?? 0,
        connectionCount: data.stats?.connections.all.total ?? 0,
        inLibrary: data.urlInLibrary,
        isConnected: data.urlIsConnected,
      };
    },
    initialData: props.initialData,
  });
}
