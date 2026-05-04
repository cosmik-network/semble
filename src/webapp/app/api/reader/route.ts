import { NextRequest, NextResponse } from 'next/server';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import createDOMPurify from 'dompurify';

export interface ReaderContent {
  title: string | null;
  content: string;
  byline: string | null;
  siteName: string | null;
  excerpt: string | null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json(
      { error: 'Missing url parameter' },
      { status: 400 },
    );
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(url);
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  let html: string;
  try {
    const response = await fetch(targetUrl.toString(), {
      headers: {
        // Mimic a real browser to avoid blocks
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      // 10 second timeout
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          error: `Failed to fetch URL: ${response.status} ${response.statusText}`,
        },
        { status: 502 },
      );
    }

    html = await response.text();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to fetch URL: ${message}` },
      { status: 502 },
    );
  }

  // Parse with jsdom, passing the URL so Readability can resolve relative links
  const dom = new JSDOM(html, { url: targetUrl.toString() });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  if (!article) {
    return NextResponse.json(
      { error: 'Could not extract readable content from this page' },
      { status: 422 },
    );
  }

  // Sanitize the extracted HTML to prevent XSS
  // Reuse the existing jsdom window so we don't spin up a second DOM instance
  const DOMPurify = createDOMPurify(dom.window as unknown as typeof globalThis);
  const sanitizedContent = DOMPurify.sanitize(article.content ?? '', {
    USE_PROFILES: { html: true },
    // Allow common article elements but strip scripts/iframes/etc.
    FORBID_TAGS: ['script', 'style', 'iframe', 'form', 'input', 'button'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
  });

  const result: ReaderContent = {
    title: article.title ?? null,
    content: sanitizedContent,
    byline: article.byline ?? null,
    siteName: article.siteName ?? null,
    excerpt: article.excerpt ?? null,
  };

  return NextResponse.json(result);
}
