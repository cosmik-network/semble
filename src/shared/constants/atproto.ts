/**
 * AT Protocol NSID constants
 * Namespaced identifiers for AT Protocol collections
 */
export const ATPROTO_NSID = {
  MARGIN: {
    NAMESPACE: 'at.margin',
    BOOKMARK: 'at.margin.bookmark',
    COLLECTION: 'at.margin.collection',
    COLLECTION_ITEM: 'at.margin.collectionItem',
  },
  COSMIK: {
    NAMESPACE: 'network.cosmik',
    CARD: 'network.cosmik.card',
    COLLECTION: 'network.cosmik.collection',
    COLLECTION_LINK: 'network.cosmik.collectionLink',
    COLLECTION_LINK_REMOVAL: 'network.cosmik.collectionLinkRemoval',
    FOLLOW: 'network.cosmik.follow',
    CONNECTION: 'network.cosmik.connection',
  },
} as const;
