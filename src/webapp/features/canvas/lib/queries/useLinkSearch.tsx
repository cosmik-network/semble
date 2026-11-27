import { useInfiniteQuery } from '@tanstack/react-query';
import { linkSearchQuery, type SearchScope } from '../../server/canvasServer';
import { useCanvasServer } from '../canvasServerContext';

export default function useLinkSearch(
  scope: SearchScope,
  query: string,
  enabled: boolean,
) {
  const server = useCanvasServer();
  const search = useInfiniteQuery({
    ...linkSearchQuery(server, scope, query),
    enabled,
  });
  // A link can be on two pages if the list shifts between fetches
  const seen = new Set<string>();
  const data = search.data?.pages
    .flatMap((page) => page.links)
    .filter((link) => !seen.has(link.url) && !!seen.add(link.url));
  return { ...search, data };
}
