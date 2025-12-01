export interface StrongRef {
  uri: string;
  cid: string;
}

export interface UrlMetadata {
  title?: string;
  description?: string;
  author?: string;
  siteName?: string;
  imageUrl?: string;
  type?: string;
  retrievedAt?: string;
}

export interface CreateCardResult {
  urlCard: StrongRef;
  noteCard?: StrongRef;
}

export interface CreateCardOptions {
  url: string;
  note?: string;
}

export interface CreateCollectionOptions {
  name: string;
  description?: string;
}

export interface SemblePDSClientOptions {
  service: string;
  // Optional environment string that gets appended to the NSID, e.g. cosmik.network.{env}.*
  env?: string;
}
