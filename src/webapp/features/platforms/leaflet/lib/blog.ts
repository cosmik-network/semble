/**
 * The Cosmik blog is a Leaflet publication living in Cosmik's own AT Protocol
 * repo, so its posts are readable records rather than something to scrape. The
 * publication URI is what ties a post to *this* blog — the repo holds documents
 * for more than one publication, and it's also the id the email form subscribes
 * against.
 */
export const COSMIK_BLOG_DID = 'did:plc:b2p6rujcgpenbtcjposmjuc3';

export const COSMIK_BLOG_PUBLICATION_URI = `at://${COSMIK_BLOG_DID}/site.standard.publication/3m3axfv5hms24`;

export const COSMIK_BLOG_URL = 'https://blog.cosmik.network';

/** Posts are `site.standard.document` records; `path` is the slug on the blog. */
export const BLOG_DOCUMENT_COLLECTION = 'site.standard.document';
