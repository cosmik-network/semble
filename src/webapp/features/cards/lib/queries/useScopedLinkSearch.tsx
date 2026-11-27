import { useInfiniteQuery } from '@tanstack/react-query';
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

interface LinkPage {
  links: LinkResult[];
  nextPage?: number;
}

// Links in the viewer's library, recent first until there's a query, or
// links anyone on Semble has saved that match it
export default function useScopedLinkSearch(
  scope: SearchScope,
  query: string,
  enabled: boolean,
) {
  const search = useInfiniteQuery({
    queryKey: cardKeys.linkSearch(scope, query),
    initialPageParam: 1,
    queryFn: async ({ pageParam }): Promise<LinkPage> => {
      if (scope === 'mine') {
        const { cards, pagination } = await getMyUrlCards({
          page: pageParam,
          limit: RESULTS,
          searchText: query || undefined,
        });
        return {
          links: cards.map((card) => ({
            url: card.url,
            title: card.cardContent.title,
            imageUrl: card.cardContent.imageUrl,
            inLibrary: true,
            isRecent: !query,
          })),
          nextPage: pagination.hasMore ? pageParam + 1 : undefined,
        };
      }
      if (!query) return { links: [] };
      const { urls, pagination } = await searchUrls({
        searchQuery: query,
        page: pageParam,
        limit: RESULTS,
      });
      return {
        links: urls.map((link) => ({
          url: link.url,
          title: link.metadata.title,
          imageUrl: link.metadata.imageUrl,
          inLibrary: link.urlInLibrary,
          isRecent: false,
        })),
        nextPage: pagination.hasMore ? pageParam + 1 : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled,
    meta: { searchScope: scope },
    // Only while typing, so one scope's results never show under the other
    placeholderData: (previous, previousQuery) =>
      previousQuery?.meta?.searchScope === scope ? previous : undefined,
  });

  // A link can be on two pages if the list shifts between fetches
  const seen = new Set<string>();
  const data = search.data?.pages
    .flatMap((page) => page.links)
    .filter((link) => !seen.has(link.url) && !!seen.add(link.url));

  return { ...search, data };
}
