const COLLECTION_PATH = /^\/profile\/([^/]+)\/collections\/([^/?#]+)/;

// Collections are connected by their Semble page URL, the same one the webapp uses
export const collectionUrl = (handle: string, rkey: string) =>
  `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/profile/${handle}/collections/${rkey}`;

// Collection page URLs match on handle and rkey alone, whatever host they were saved with
export function nodeKey(url: string) {
  try {
    const match = new URL(url).pathname.match(COLLECTION_PATH);
    if (match) return `collection:${match[1].toLowerCase()}/${match[2]}`;
  } catch {
    // Not a URL; fall through
  }
  return url;
}
