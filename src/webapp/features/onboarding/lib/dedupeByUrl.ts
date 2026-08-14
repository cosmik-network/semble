/**
 * First occurrence wins. Recommendation pages are randomised server-side, so
 * the same URL can come back on two of them.
 */
export function dedupeByUrl<T extends { url: string }>(views: T[]): T[] {
  const seen = new Set<string>();

  return views.filter((view) => {
    if (seen.has(view.url)) return false;
    seen.add(view.url);
    return true;
  });
}
