import { Result } from 'src/shared/core/Result';
import { IMetadataService } from '../domain/services/IMetadataService';
import { URL as VO_URL } from '../domain/value-objects/URL';
import {
  UrlMetadata,
  UrlMetadataProps,
} from '../domain/value-objects/UrlMetadata';
import { UrlType } from '../domain/value-objects/UrlType';
import { parse as parse5, type DefaultTreeAdapterTypes } from 'parse5';

/** A custom metadata web scrapper that also parses [AT tags](https://tangled.org/chrisshank.com/at-tags). */
export class HTMLMetadataService implements IMetadataService {
  // We're directly parsing HTML pages so it's always available.
  async isAvailable() {
    return true;
  }

  async fetchMetadata(_url: VO_URL): Promise<Result<UrlMetadata>> {
    const url = _url.value;
    const scrapped = await scrapMetadata(url);

    let cardyb: UrlMetadataProps = { url };
    if (
      scrapped.title === undefined ||
      scrapped.description === undefined ||
      scrapped.imageUrl === undefined
    ) {
      cardyb = await cardybMetadata(url);
    }

    return UrlMetadata.create({
      url,
      type: scrapped.doi ? UrlType.RESEARCH : UrlType.ARTICLE,
      retrievedAt: new Date(),
      title: scrapped.title || cardyb.title,
      description: scrapped.description || cardyb.description,
      author: scrapped.author,
      publishedDate: scrapped.publishedDate,
      siteName: scrapped.siteName,
      imageUrl: scrapped.imageUrl || cardyb.imageUrl,
      doi: scrapped.doi,
      isbn: scrapped.isbn,
      atCanonical: scrapped.atCanonical,
      atAuthors: scrapped.atAuthors,
      atMe: scrapped.atMe,
    });
  }
}

const isElement = (
  el: DefaultTreeAdapterTypes.ChildNode,
  tagName: string,
): el is DefaultTreeAdapterTypes.Element => el.nodeName === tagName;

const isText = (
  el: DefaultTreeAdapterTypes.ChildNode,
): el is DefaultTreeAdapterTypes.TextNode => el.nodeName === '#text';

const re =
  /^\s*(\d+)(?:\s*;(?:\s*url\s*=)?\s*(?:["']\s*(.*?)\s*['"]|(.*?)))?\s*$/i;

// Value looks like '5; url=https://www.example.com/'
function parseMetaRefresh(content: string) {
  const results = re.exec(content);

  let timeout = null,
    url = null;

  if (results !== null && results[1] !== undefined) {
    timeout = parseInt(results[1], 10);

    url = results[2] || results[3] || null; // first matching group
  }

  return { timeout, url };
}

interface CardyBResponse {
  error: string;
  likely_type: string;
  url: string;
  title: string;
  description: string;
  image: string;
}

// Fallback to bluesky cardyb scrapper, it seems to get metadata for links to ScienceDirect
async function cardybMetadata(url: string): Promise<UrlMetadataProps> {
  try {
    const response = await fetch(
      `https://cardyb.bsky.app/v1/extract?url=${url}`,
    );

    if (!response.ok) return { url };

    const data = (await response.json()) as CardyBResponse;

    if (data.error !== '') return { url };

    return {
      url,
      title: data.title || undefined,
      description: data.description || undefined,
      imageUrl: data.image || undefined,
    };
  } catch (e) {
    console.error('error fetching cardyb', e);
    return { url };
  }
}

const MAX_REDIRECTS = 5;

interface ScrapContext {
  originalURL: string;
  redirectCount: number;
}

async function scrapMetadata(
  url: string,
  { originalURL, redirectCount }: ScrapContext = {
    originalURL: url,
    redirectCount: 0,
  },
): Promise<UrlMetadataProps> {
  try {
    if (redirectCount >= MAX_REDIRECTS) return { url: originalURL };

    const currentURL = URL.parse(url);

    if (currentURL === null) return { url: originalURL };

    const response = await fetch(url, {
      method: 'GET',
      redirect: 'manual',
      // eslint-disable-next-line no-undef
      signal: AbortSignal.timeout(10_000),
    });

    if (response.status > 300) {
      const redirectURL =
        response.headers.get('location') ||
        response.headers.get('content-location');
      if (redirectURL !== null) {
        // In case the new URL is a relative URL then use the origin of the current URL.
        const newURL = new URL(redirectURL, currentURL.origin);
        return scrapMetadata(newURL.toString(), {
          originalURL,
          redirectCount: redirectCount + 1,
        });
      }
    }

    const contentType = response.headers.get('content-type');
    if (
      contentType?.includes('application/pdf') ||
      currentURL.pathname.endsWith('.pdf')
    ) {
      // TODO: Enable experimental PDF scrapper

      // const data = await response.bytes();

      // const parser = new PDFParse({ data });

      // const result = await parser.getInfo();
      // const dates = result.getDateNode();
      // console.log(result.info, result.metadata);
      // return {
      //   url: originalURL,
      //   title: result.info?.Title,
      //   author: result.info?.Author,
      //   publishedDate: dates.CreationDate || dates.ModDate || undefined,
      // };
      return { url };
    }

    if (contentType === undefined || contentType?.includes('text/html')) {
      const html = await response.text();
      return parseHTML(url, html, { originalURL, redirectCount });
    }

    return { url: originalURL };
  } catch (e) {
    console.error('error fetching metadata', originalURL, e);
    return { url: originalURL };
  }
}

function parseHTML(
  url: string,
  html: string,
  { originalURL, redirectCount }: ScrapContext,
) {
  const currentURL = URL.parse(url);

  if (currentURL === null) return { url: originalURL };

  const props: UrlMetadataProps = {
    url: originalURL,
    title: undefined,
    description: undefined,
    author: undefined,
    publishedDate: undefined,
    imageUrl: undefined,
    siteName: undefined,
    type: undefined,
    doi: undefined,
    isbn: undefined,
    atCanonical: undefined,
    atAuthors: undefined,
    atMe: undefined,
  };

  const document = parse5(html);
  const root = document.childNodes.find((el) => isElement(el, 'html'));
  const head = root?.childNodes.find((el) => isElement(el, 'head'));
  const body = root?.childNodes.find((el) => isElement(el, 'body'));

  // Check for http-equiv redirect
  for (const el of head?.childNodes || []) {
    if (isElement(el, 'meta')) {
      const httpEquiv = el.attrs.find(
        (attr) => attr.name === 'http-equiv',
      )?.value;
      const content = el.attrs.find((attr) => attr.name === 'content')?.value;
      const { url: parsedUrl } = parseMetaRefresh(content || '');
      if (httpEquiv && parsedUrl) {
        // In case the new URL is a relative URL then use the origin of the current URL.
        const newURL = new URL(parsedUrl, currentURL.origin);
        return scrapMetadata(newURL.toString(), {
          originalURL,
          redirectCount: redirectCount + 1,
        });
      }
    }
  }

  const els = (head?.childNodes || []).concat(body?.childNodes || []);

  // Parse out meta tags
  for (const el of els) {
    if (isElement(el, 'title')) {
      const textNode = el.childNodes[0];
      if (textNode && isText(textNode) && textNode.value) {
        props.title = textNode.value;
      }
    } else if (isElement(el, 'meta')) {
      const name = el.attrs.find((attr) => attr.name === 'name')?.value;
      const content = el.attrs.find(
        (attr) =>
          attr.name === 'content' ||
          // Handle edge case for Open Graph tags
          (name?.startsWith('og:') && attr.name === 'property'),
      )?.value;

      if (name === undefined || content === undefined) continue;

      // standard properties documentation: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name
      // custom properties documentation: https://wiki.whatwg.org/wiki/MetaExtensions
      switch (name.toLowerCase()) {
        // TODO: extract keywords
        case 'author':
        case 'citation_author':
        case 'twitter:creator': {
          props.author ??= content;
          break;
        }
        case 'description':
        case 'dc.description':
        case 'twitter:description':
        case 'og:description': {
          props.description ??= content;
          break;
        }
        case 'og:image':
        case 'og:image:secure_url': {
          props.imageUrl ??= content;
          break;
        }
        case 'citation_doi': {
          props.doi ??= content;
          break;
        }
        case 'citation_issn': {
          props.isbn ??= content;
          break;
        }
        case 'citation_date':
        case 'citation_publication_date':
        case 'dc.created': {
          props.publishedDate ??= new Date(content);
          break;
        }
        case 'og:site_name': {
          props.siteName ??= content;
          break;
        }
        case 'citation_title':
        case 'dc.title':
        case 'twitter:title':
        case 'og:title': {
          props.title ??= content;
          break;
        }

        case 'at:canonical': {
          props.atCanonical ??= [];
          props.atCanonical.push(content);
          break;
        }
        case 'at:authors': {
          props.atAuthors ??= [];
          props.atAuthors.push(content);
          break;
        }
        case 'at:me': {
          props.atMe ??= [];
          props.atMe.push(content);
          break;
        }
      }
    }

    // TODO: Wes wants to do <link> parsing in a second step
    // else if (isElement(el, 'link')) {
    //   const rel = el.attrs.find((attr) => attr.name === 'rel')?.value;
    //   const href = el.attrs.find((attr) => attr.name === 'href')?.value;

    //   if (rel === undefined || href === undefined) return;

    //   switch (rel) {
    //     case 'canonical': {
    //       props.canonicalURL ??= href;
    //       break;
    //     }
    //   }
    // }
  }

  return props;
}
