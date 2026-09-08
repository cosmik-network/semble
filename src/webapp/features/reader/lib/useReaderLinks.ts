import { useMemo } from 'react';
import {
  normalizeUrl,
  toReaderLink,
  type ReaderLink,
} from './utils/readerLink';

export type { ReaderLink } from './utils/readerLink';

/** Extracts saveable links from the reader article HTML, deduped by href. */
export function extractReaderLinks(
  content: string,
  articleUrl: string,
): ReaderLink[] {
  if (typeof DOMParser === 'undefined') return [];

  const doc = new DOMParser().parseFromString(content, 'text/html');
  const seen = new Set<string>();
  const links: ReaderLink[] = [];

  for (const anchor of Array.from(doc.querySelectorAll('a[href]'))) {
    const link = toReaderLink(
      anchor.getAttribute('href') ?? '',
      anchor.textContent ?? '',
      articleUrl,
    );
    if (!link) continue;

    const normalized = normalizeUrl(link.href);
    if (seen.has(normalized)) continue;
    seen.add(normalized);

    links.push(link);
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
