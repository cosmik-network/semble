interface FeedPage {
  activities: unknown[];
  pagination: { currentPage: number; hasMore: boolean };
}

// Upper bound on extra requests per page fetch, so a long run of filtered
// pages can't turn one scroll into an unbounded request chain.
const MAX_EXTRA_PAGES = 5;

/**
 * The feed API drops activities it can't hydrate (e.g. author profile not
 * found) after paginating, so a page can come back empty while `hasMore` is
 * still true. Keep fetching forward until a page has activities. The returned
 * `currentPage` is the last page actually fetched, so `getNextPageParam`
 * resumes after it instead of refetching skipped pages.
 */
export async function skipEmptyPages<T extends FeedPage>(
  startPage: number,
  signal: AbortSignal,
  fetchPage: (page: number) => Promise<T>,
): Promise<T> {
  let result = await fetchPage(startPage);
  for (
    let extra = 0;
    extra < MAX_EXTRA_PAGES &&
    !signal.aborted &&
    result.activities.length === 0 &&
    result.pagination.hasMore;
    extra++
  ) {
    result = await fetchPage(result.pagination.currentPage + 1);
  }
  return result;
}
