import {
  NotificationType,
  CollectionAccessType,
  type User,
  type Collection,
  type UrlMetadata,
} from '@/api-client';

/**
 * Static mock data for the decorative orbital hero on the landing page.
 * Nothing here is fetched or persisted — it only feeds the presentational
 * cards (NotificationActivityStatus, LinkCardContent, HeroCollectionCard) so
 * the composition mirrors the real product UI without touching the API.
 */

// Small self-contained colored-initial avatar (avoids bundling image assets or
// hitting the network). Rendered by Mantine's <Avatar src=... />.
const initialAvatar = (bg: string, initial: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="${bg}"/><text x="32" y="43" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="white" text-anchor="middle">${initial}</text></svg>`,
  )}`;

const patrick: User = {
  id: 'did:plc:mock-patrick',
  name: 'Patrick Singletary',
  handle: 'patrick.bsky.social',
  avatarUrl: initialAvatar('#2F9E44', 'P'),
};

const victoria: User = {
  id: 'did:plc:mock-victoria',
  name: 'Victoria',
  handle: 'vicwalker.dev.br',
  avatarUrl: initialAvatar('#9C36B5', 'V'),
};

const collectionAuthor: User = {
  id: 'did:plc:mock-author',
  name: 'Semble',
  handle: 'cosmik.network',
};

// "started following The Communal Aux"
export const followCollection: Collection = {
  id: 'mock-collection-communal-aux',
  uri: 'at://did:plc:mock-author/network.cosmik.collection/communalaux',
  name: 'The Communal Aux',
  author: collectionAuthor,
  accessType: CollectionAccessType.OPEN,
  cardCount: 34,
  createdAt: '2026-05-01T00:00:00.000Z',
  updatedAt: '2026-05-01T00:00:00.000Z',
};

// "added your card to AT Codes"
export const addedCollection: Collection = {
  id: 'mock-collection-at-codes',
  uri: 'at://did:plc:mock-author/network.cosmik.collection/atcodes',
  name: 'AT Codes',
  author: collectionAuthor,
  accessType: CollectionAccessType.OPEN,
  cardCount: 12,
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
};

export const followNotification = {
  user: patrick,
  type: NotificationType.USER_FOLLOWED_YOUR_COLLECTION,
  collections: [followCollection],
  createdAt: '2026-05-08T00:00:00.000Z', // ~2mo before the mocked "today"
  iconColor: 'blue',
};

export const addedCardNotification = {
  user: victoria,
  type: NotificationType.USER_ADDED_YOUR_CARD,
  collections: [addedCollection],
  createdAt: '2026-06-15T00:00:00.000Z', // ~23d before the mocked "today"
  iconColor: 'tangerine',
};

// Substack link card
export const linkCardContent: UrlMetadata = {
  url: 'https://davidbessis.substack.com/p/attention-is-all-we-have',
  title: 'Attention is all we have',
  description: 'A conjectural theory of cognitive inequality',
  siteName: 'Substack',
};

// "Cognitive Engineering" collection card
export const heroCollection = {
  name: 'Cognitive Engineering',
  cardCount: 21,
  updatedAt: 'Updated 40m ago',
};
