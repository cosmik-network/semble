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
// hitting the network). Rendered by Mantine's <Avatar src=... />. Fills the
// whole box with a solid rect so the Avatar's own `radius` (theme default `md`)
// clips it into a rounded square — matching real avatars — rather than the SVG
// baking in a circle.
const initialAvatar = (bg: string, initial: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="${bg}"/><text x="32" y="43" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="white" text-anchor="middle">${initial}</text></svg>`,
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

// Someone who started following you (rendered as a notification).
const leo: User = {
  id: 'did:plc:mock-leo',
  name: 'Leo Vargas',
  handle: 'leov.bsky.social',
  avatarUrl: initialAvatar('#E8590C', 'L'),
};

// "started following Ways of Seeing"
export const followCollection: Collection = {
  id: 'mock-collection-ways-of-seeing',
  uri: 'at://did:plc:mock-author/network.cosmik.collection/waysofseeing',
  name: 'Ways of Seeing',
  author: collectionAuthor,
  accessType: CollectionAccessType.OPEN,
  cardCount: 34,
  createdAt: '2026-05-01T00:00:00.000Z',
  updatedAt: '2026-05-01T00:00:00.000Z',
};

// "added your card to On Attention"
export const addedCollection: Collection = {
  id: 'mock-collection-on-attention',
  uri: 'at://did:plc:mock-author/network.cosmik.collection/onattention',
  name: 'On Attention',
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

// "Leo Vargas started following you"
export const followedYouNotification = {
  user: leo,
  type: NotificationType.USER_FOLLOWED_YOU,
  createdAt: '2026-07-04T00:00:00.000Z', // ~4d before the mocked "today"
  iconColor: 'blue',
};

// ACM paper link card
export const linkCardContent: UrlMetadata = {
  url: 'https://dl.acm.org/doi/10.1145/3757576',
  title: 'Deep Storytelling',
  description:
    'Collective Sensemaking and Layers of Meaning in U.S. Elections',
  siteName: 'ACM Digital Library',
};

// "Digital Gardens" collection card
export const heroCollection = {
  name: 'Storytelling and sensemaking',
  cardCount: 21,
  updatedAt: 'Updated 32m ago',
};

// The first few cards shown in the collection's thumbnail row. Essays on
// creative reading, flânerie, and storytelling with their real og:image
// previews; falls back to the title text (like CollectionCardPreview) if an
// image fails to load.
export const heroCollectionCards: {
  url: string;
  title: string;
  imageUrl: string;
}[] = [
  {
    url: 'https://www.goodfire.ai/research/stories-in-space',
    title: 'Meandering on Manifolds: The Neural Geometry of Stories Over Time',
    imageUrl:
      'https://static.goodfire.ai/neural-geometry-agenda/wide_manifold_banner.webp',
    },
  {
    url: 'https://www.thepolisblog.org/2011/06/featured-quote-susan-sontag-on.html',
    title: 'Susan Sontag on the Photographer as Flâneur',
    imageUrl:
      'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEi0F8YPCzoi9vZxDDW9Jz3hdmcL5fIPsiyXke3dOerT3FaJHJCrAlDhj4ZFv2WJVjuiYg469VJRicF1YSQJmm4hPc-dNv7InXx8pqFLbHb5M7qUrzJ59RtwnK1eFQeb8zecd4f1Jm-3JXSa/s640/riis+photo.jpg',
  },

    {
      url: 'https://dl.acm.org/doi/full/10.1145/3800645.3812879',
      title:
        'The Flâneur and Turtle on-a-leash: Flânerie as a Metaphor for Human-AI Interaction',
      imageUrl: '',
    },
];
