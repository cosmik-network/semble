export interface ReaderLink {
  href: string;
  text: string;
}

export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = '';
    return u.toString().replace(/\/$/, '');
  } catch {
    return url;
  }
}

/** http(s) links other than the article itself; null for the rest */
export function toReaderLink(
  href: string,
  text: string,
  articleUrl: string,
): ReaderLink | null {
  if (!/^https?:\/\//i.test(href)) return null;
  if (normalizeUrl(href) === normalizeUrl(articleUrl)) return null;

  return { href, text: text.trim() || href };
}
