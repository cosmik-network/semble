// tldraw inlines each image of an export by fetching it, which fails for hosts
// that don't send CORS headers, leaving a broken image. Next's image optimizer
// is same-origin, so those fetches are retried through it.
const PROXY_WIDTH = 1080;

let active = 0;
let originalFetch: typeof window.fetch | null = null;

function proxiedUrl(url: string) {
  return `/_next/image?url=${encodeURIComponent(url)}&w=${PROXY_WIDTH}&q=75`;
}

function crossOriginHttps(input: RequestInfo | URL): string | null {
  if (typeof input !== 'string' && !(input instanceof URL)) return null;
  try {
    const url = new URL(input, window.location.href);
    if (url.protocol !== 'https:') return null;
    if (url.origin === window.location.origin) return null;
    return url.href;
  } catch {
    return null;
  }
}

export async function withProxiedExportImages<T>(
  run: () => Promise<T>,
): Promise<T> {
  if (active++ === 0) {
    const fetch = window.fetch;
    originalFetch = fetch;
    window.fetch = async (input, init) => {
      try {
        return await fetch(input, init);
      } catch (error) {
        const url = crossOriginHttps(input);
        if (!url || (init?.method && init.method !== 'GET')) throw error;
        return fetch(proxiedUrl(url), init);
      }
    };
  }
  try {
    return await run();
  } finally {
    if (--active === 0 && originalFetch) {
      window.fetch = originalFetch;
      originalFetch = null;
    }
  }
}
