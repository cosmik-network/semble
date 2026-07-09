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

// A person you follow (rendered in a ProfileCard).
export const followedPerson: User = {
  id: 'did:plc:mock-nadia',
  name: 'Nadia Kim',
  handle: 'nadia.bsky.social',
  avatarUrl: initialAvatar('#4098FF', 'N'),
  description: 'Mapping the web, one connection at a time.',
};

// Someone who started following you (rendered as a notification).
const leo: User = {
  id: 'did:plc:mock-leo',
  name: 'Leo Vargas',
  handle: 'leov.bsky.social',
  avatarUrl: initialAvatar('#E8590C', 'L'),
};

// "started following Digital Gardens"
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

// "Leo Vargas started following you"
export const followedYouNotification = {
  user: leo,
  type: NotificationType.USER_FOLLOWED_YOU,
  createdAt: '2026-07-04T00:00:00.000Z', // ~4d before the mocked "today"
  iconColor: 'blue',
};

// Compact "collection you follow" card (name + card count + Following button).
export const followedCollection = {
  name: 'Design Systems',
  cardCount: 18,
};

// Substack link card
export const linkCardContent: UrlMetadata = {
  url: 'https://davidbessis.substack.com/p/attention-is-all-we-have',
  title: 'Attention is all we have',
  description: 'A conjectural theory of cognitive inequality',
  siteName: 'Substack',
};

// "Digital Gardens" collection card
export const heroCollection = {
  name: 'Digital Gardens',
  cardCount: 21,
  updatedAt: 'Updated 32m ago',
};

// The first few cards shown in the collection's thumbnail row. Real
// digital-garden essays with their real og:image previews; falls back to the
// title text (like CollectionCardPreview) if an image fails to load.
export const heroCollectionCards: {
  url: string;
  title: string;
  imageUrl: string;
}[] = [
  {
    url: 'https://maggieappleton.com/garden-history',
    title: 'A Brief History & Ethos of the Digital Garden',
    imageUrl:
      'https://res.cloudinary.com/dxj9qr5gj/image/upload/c_scale,f_auto,q_auto:best,w_1000/v1622719121/maggieappleton.com/notes/garden-history/garden-main_ayoaqo_shrink_szbgc7.png',
    },
    {
      url: 'https://joelhooks.com/digital-garden',
      title: 'My blog is a digital garden, not a blog',
      imageUrl:
        'https://res.cloudinary.com/badass-courses/image/upload/w_1200,h_630,c_fill,f_auto/w_1020,h_450,c_fit,co_rgb:FFFFFF,g_west,x_90,y_-40,l_text:Roboto_60_left_bold:my%20blog%20is%20a%20digital%20garden%20not%20a%20blog/v1731357274/social-image-templates/joelhooks-com_sbhjby.png',
    },
  {
    url: 'https://tomcritchlow.com/2018/10/10/of-gardens-and-wikis/',
    title: 'Of Gardens and Wikis',
    imageUrl: 'https://tomcritchlow.com/images/green.png',
  },
  {
    url: 'https://nesslabs.com/mind-garden',
    title: 'Building a mind garden to grow your ideas',
    imageUrl:
      'https://nesslabs.com/wp-content/uploads/2020/04/mind-garden-banner.png',
  },
];
