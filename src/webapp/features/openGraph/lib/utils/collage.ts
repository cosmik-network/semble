import { UrlCard } from '@semble/types';
import { getDomain } from '@/lib/utils/link';

/**
 * A single tile in the collection OG image collage. Each link in the collection
 * degrades through a fallback chain: embed image -> favicon + title -> domain.
 */
export type CollageTile =
  | { kind: 'image'; dataUri: string }
  | { kind: 'favicon'; dataUri: string; title: string; domain: string }
  | { kind: 'domain'; domain: string };

// Per-image network budget. `next/og` fetches images while generating the
// image, so a slow host must never be allowed to hang the whole response.
const IMAGE_TIMEOUT_MS = 2500;

/**
 * Fetch a remote image and return it as a base64 `data:` URI, or `null` on any
 * failure (non-2xx, non-image content-type, timeout, network error, empty
 * body). This is the single choke point that guarantees satori (`next/og`) only
 * ever receives verified image bytes — an unverified `<img src>` that fails to
 * decode would throw and break the entire OG image.
 */
export async function fetchImageAsDataUri(
  url: string,
  options?: { timeoutMs?: number },
): Promise<string | null> {
  const timeoutMs = options?.timeoutMs ?? IMAGE_TIMEOUT_MS;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        // Some hosts 403 requests without a browser-like UA.
        'User-Agent':
          'Mozilla/5.0 (compatible; SembleOpenGraph/1.0; +https://semble.so)',
      },
    });

    if (!res.ok) return null;

    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.startsWith('image/')) return null;

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.byteLength === 0) return null;

    const mime = contentType.split(';')[0].trim();
    return `data:${mime};base64,${buffer.toString('base64')}`;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Google's favicon service, which returns a PNG (satori-safe). It 404s for
 * domains it has no icon for, in which case the caller falls through to a
 * domain tile.
 */
export function getFaviconUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
    domain,
  )}&sz=128`;
}

/** Hostname without a leading `www.`, e.g. `www.example.com` -> `example.com`. */
export function shortenDomain(url: string): string {
  return getDomain(url).replace(/^www\./, '');
}

/**
 * Route an embed image through the images.weserv.nl proxy to normalize any
 * format (WebP/AVIF, which satori cannot reliably decode) to a small JPEG and
 * resize it to the tile size. Swappable — the fallback chain keeps the tile
 * safe even if the proxy is removed.
 */
export function normalizeEmbedImageUrl(url: string): string {
  const withoutScheme = url.replace(/^https?:\/\//, '');
  return `https://images.weserv.nl/?url=${encodeURIComponent(
    withoutScheme,
  )}&w=400&h=400&fit=cover&output=jpg`;
}

async function buildTileForCard(card: UrlCard): Promise<CollageTile> {
  const domain = shortenDomain(card.url);

  try {
    // 1. Embed image
    if (card.cardContent.imageUrl) {
      const dataUri = await fetchImageAsDataUri(
        normalizeEmbedImageUrl(card.cardContent.imageUrl),
      );
      if (dataUri) return { kind: 'image', dataUri };
    }

    // 2. Favicon + page title
    const faviconDataUri = await fetchImageAsDataUri(getFaviconUrl(domain));
    if (faviconDataUri) {
      return {
        kind: 'favicon',
        dataUri: faviconDataUri,
        title: card.cardContent.title || domain,
        domain,
      };
    }
  } catch {
    // fall through to the domain tile
  }

  // 3. Shortened domain
  return { kind: 'domain', domain };
}

/**
 * Resolve the collection's cards into up to `max` collage tiles, running every
 * per-card fallback chain in parallel. Never throws and never returns a tile
 * whose image could break satori.
 */
export async function buildCollageTiles(
  urlCards: UrlCard[],
  options?: { max?: number },
): Promise<CollageTile[]> {
  const max = options?.max ?? 5;
  // Every card yields a tile (image -> favicon -> domain floor), so we only
  // need to resolve as many cards as we render — no wasted fetches.
  const candidates = urlCards.slice(0, max);

  return Promise.all(candidates.map((card) => buildTileForCard(card)));
}
