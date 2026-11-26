import { useQuery } from '@tanstack/react-query';
import { searchUrls } from '@/features/connections/lib/dal';
import type { SearchScope } from '@/features/search/lib/searchScope';
import { cardKeys } from '../cardKeys';
import { getMyUrlCards } from '../dal';

const RESULTS = 8;

export interface LinkResult {
  url: string;
  title?: string;
  imageUrl?: string;
  // Unknown when the search doesn't say
  inLibrary?: boolean;
  // Listed as one of the viewer's recent cards rather than matching a query
  isRecent: boolean;
}

// Links in the viewer's library, recent first until there's a query, or
// links anyone on Semble has saved that match it
export default function useScopedLinkSearch(
  scope: SearchScope,
  query: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: cardKeys.linkSearch(scope, query),
    queryFn: async (): Promise<LinkResult[]> => {
      if (scope === 'mine') {
        const { cards } = await getMyUrlCards({
          limit: RESULTS,
          searchText: query || undefined,
        });
        return cards.map((card) => ({
          url: card.url,
          title: card.cardContent.title,
          imageUrl: card.cardContent.imageUrl,
          inLibrary: true,
          isRecent: !query,
        }));
      }
      if (!query) return [];
      const { urls } = await searchUrls({ searchQuery: query, limit: RESULTS });
      return urls.map((link) => ({
        url: link.url,
        title: link.metadata.title,
        imageUrl: link.metadata.imageUrl,
        inLibrary: link.urlInLibrary,
        isRecent: false,
      }));
    },
    enabled,
    meta: { searchScope: scope },
    // Only while typing, so one scope's results never show under the other
    placeholderData: (previous, previousQuery) =>
      previousQuery?.meta?.searchScope === scope ? previous : undefined,
  });
}
