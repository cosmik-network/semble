/**
 * Params for the recommended-cards query the explore page runs.
 *
 * Several components read this query: `ExploreCards` renders it, and the
 * Collections and Profiles shelves derive their seed URLs from its first page
 * via `useExploreSeedUrls`. TanStack keys on these values, so sharing one
 * object is what keeps every reader on a single cache entry and a single
 * request rather than independently ranked sets.
 *
 * Empty `queries` lets the server derive them: from the reader's library and
 * bio when signed in, from recent global feed activity otherwise.
 */
export const EXPLORE_CARDS_QUERY = {
  queries: [] as string[],
  limit: 10,
};
