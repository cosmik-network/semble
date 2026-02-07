/**
 * Check if a URI is from Margin
 * @param uri - The AT Protocol URI to check
 * @returns true if the URI includes '/at.margin.'
 */
export function isMarginUri(uri?: string): boolean {
  if (!uri) return false;
  return uri.includes('/at.margin.');
}

/**
 * Extract Margin URL from an AT Protocol URI
 * @param uri - The AT Protocol URI (e.g., "at://did:plc:xyz/at.margin.bookmark/3mdjtvntgej2v")
 * @param handle - The user's handle (e.g., "alice.bsky.social") - optional, will use DID if not provided
 * @returns The Margin URL or null if not a valid Margin URI
 * @example
 * getMarginUrl("at://did:plc:xyz/at.margin.bookmark/3mdjtvntgej2v", "alice.bsky.social")
 * // returns "https://margin.at/alice.bsky.social/bookmark/3mdjtvntgej2v"
 *
 * getMarginUrl("at://did:plc:xyz/at.margin.bookmark/3mdjtvntgej2v")
 * // returns "https://margin.at/did:plc:xyz/bookmark/3mdjtvntgej2v"
 */
export function getMarginUrl(uri?: string, handle?: string): string | null {
  if (!uri || !isMarginUri(uri)) return null;

  // URI format: at://did:plc:xyz/at.margin.{collection|bookmark}/{rkey}
  const parts = uri.split('/');
  if (parts.length < 4) return null;

  const collection = parts[parts.length - 2]; // "at.margin.bookmark" or "at.margin.collection"
  const rkey = parts[parts.length - 1]; // "3mdjtvntgej2v"

  // Extract the type from collection name
  const type = collection.replace('at.margin.', ''); // "bookmark" or "collection"

  // Use handle if provided, otherwise extract DID from URI
  const identifier = handle || parts[2]; // parts[2] is the DID from "at://did:plc:xyz/..."

  return `https://margin.at/${identifier}/${type}/${rkey}`;
}
