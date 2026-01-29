/**
 * Check if a URI is from Margin
 * @param uri - The AT Protocol URI to check
 * @returns true if the URI includes '/at.margin.'
 */
export function isMarginUri(uri?: string): boolean {
  if (!uri) return false;
  return uri.includes('/at.margin.');
}
