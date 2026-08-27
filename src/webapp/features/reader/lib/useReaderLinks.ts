import { useMemo } from 'react';

export interface ReaderLink {
  href: string;
  text: string;
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = '';
    return u.toString().replace(/\/$/, '');
  } catch {
    return url;
  }
}

/**
 * Extracts saveable links from the reader article HTML: http(s) only,
 * deduped by href, excluding links back to the article itself.
 */
export function extractReaderLinks(
  content: string,
  articleUrl: string,
): ReaderLink[] {
  if (typeof DOMParser === 'undefined') return [];

  const doc = new DOMParser().parseFromString(content, 'text/html');
  const normalizedArticleUrl = normalizeUrl(articleUrl);
  const seen = new Set<string>();
  const links: ReaderLink[] = [];

  for (const anchor of Array.from(doc.querySelectorAll('a[href]'))) {
    const href = anchor.getAttribute('href') ?? '';
    if (!/^https?:\/\//i.test(href)) continue;

    const normalized = normalizeUrl(href);
    if (normalized === normalizedArticleUrl) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);

    links.push({
      href,
      text: anchor.textContent?.trim() || href,
    });
  }

  return links;
}

export default function useReaderLinks(
  content: string,
  articleUrl: string,
): ReaderLink[] {
  return useMemo(
    () => extractReaderLinks(content, articleUrl),
    [content, articleUrl],
  );
}
