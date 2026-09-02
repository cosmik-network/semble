import { useDebouncedValue } from '@mantine/hooks';
import { useQuery } from '@tanstack/react-query';
import type { ActiveToken, ProfileView, TagSummary } from '@semble/types';
import useTags from '@/features/tags/lib/queries/useTags';
import { searchAtProtoAccounts } from '@/features/search/lib/dal';

// Stable fallbacks so consumers can safely use `tags`/`actors` as effect deps
const NO_TAGS: TagSummary[] = [];
const NO_ACTORS: ProfileView[] = [];

/**
 * Fetches autocomplete suggestions for the active #tag or @mention token.
 * `isSearching` covers both the debounce window (typed query hasn't reached
 * the request yet) and an in-flight request.
 */
export default function useSuggestions(token: ActiveToken | null) {
  const [debouncedQuery] = useDebouncedValue(token?.query ?? '', 200);

  const tagQuery = useTags({
    q: token?.type === 'tag' ? debouncedQuery : undefined,
    limit: 8,
    enabled: token?.type === 'tag',
  });

  const mentionQuery = useQuery({
    queryKey: ['mention-autocomplete', debouncedQuery],
    queryFn: () => searchAtProtoAccounts(debouncedQuery, { limit: 8 }),
    enabled: token?.type === 'mention' && debouncedQuery.trim().length > 0,
    staleTime: 30_000,
  });

  const isSearching =
    token != null &&
    (token.query !== debouncedQuery ||
      (token.type === 'tag' ? tagQuery.isFetching : mentionQuery.isFetching));

  return {
    tags: tagQuery.data?.tags ?? NO_TAGS,
    actors: mentionQuery.data?.actors ?? NO_ACTORS,
    isSearching,
  };
}
