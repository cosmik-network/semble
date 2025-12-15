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
  viaCard?: StrongRef;
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

export interface CardRecord {
  uri: string;
  cid: string;
  value: {
    $type: string;
    type: 'URL' | 'NOTE';
    content: any;
    url?: string;
    parentCard?: StrongRef;
    createdAt: string;
    originalCard?: StrongRef;
    provenance?: {
      $type: string;
      via?: StrongRef;
    };
  };
}

export interface CollectionRecord {
  uri: string;
  cid: string;
  value: {
    $type: string;
    name: string;
    description?: string;
    accessType: 'OPEN' | 'CLOSED';
    collaborators?: string[];
    createdAt: string;
    updatedAt: string;
  };
}

export interface GetCardsResult {
  cursor?: string;
  records: CardRecord[];
}

export interface GetCollectionsResult {
  cursor?: string;
  records: CollectionRecord[];
}

export interface ListQueryParams {
  limit?: number;
  cursor?: string;
  reverse?: boolean;
}
