/**
 * Static mock data for the decorative "Knowledge Trail" landing section.
 * Nothing here is fetched or persisted — it only feeds the presentational
 * trail cards so the composition mirrors the real product UI without touching
 * the API. Mirrors the approach used by `orbitalHero/mockData.ts`.
 */

// "See who shares your interest" — overlapping avatars (rendered with the
// initial as the Avatar's children, colored via the `color` prop).
export const interestAvatars = [
  { initial: 'A', color: '#2F9E44' },
  { initial: 'M', color: '#1e4dd9' },
  { initial: 'K', color: '#9C36B5' },
];

// "Discover relevant content" — search-results rows for real digital-garden
// pages. The last row is "expanded" to show the result title. `faviconUrl` uses
// Google's favicon service so the thumb shows each site's real favicon.
const favicon = (domain: string) =>
  `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

export const searchResults: {
  domain: string;
  title?: string;
  faviconUrl: string;
}[] = [
  {
    domain: 'maggieappleton.com',
    title: 'Digital Gardening for Non-Technical Folks',
    faviconUrl: favicon('maggieappleton.com'),
  },
  {
    domain: 'lefos.com',
    title: 'Lefos, create your own garden on the internet.',
    faviconUrl: favicon('lefos.com'),
  },
  {
    domain: 'trcc.timrodenbroeker.de',
    title: 'How I built myself a Digital Garden',
    faviconUrl: favicon('trcc.timrodenbroeker.de'),
  },
];

// "Find new perspectives" — a note/annotation card.
export const perspectiveNote = {
  quote:
    "Notes from a wonderfully interdisciplinary Edinburgh workshop on 'Rewilding the Web', ranging coopetition and biological variety through the philosophy of self-organisation, polycrisis governance, protopian science fiction, and moderation seen through the lens of artisanal cheese",
  author: 'Ailce',
  authorInitial: 'A',
  authorColor: '#2F9E44',
  createdAt: '12m ago',
};

// "Find related collections" — a collection card.
export const trailCollection = {
  name: 'Digital Gardens',
  subtitle: 'Ecological Media',
  cardCount: 4,
  updatedAt: 'Updated 40m ago',
  // Mirrors HeroCollectionCard's gradient thumbnail tiles.
  thumbs: [
    'linear-gradient(135deg, #4098FF 0%, #1e4dd9 100%)',
    'linear-gradient(135deg, #E8352E 0%, #B01B15 100%)',
    'linear-gradient(135deg, #F7B733 0%, #9C36B5 60%, #2F9E44 100%)',
  ],
};

// The glowing URL card at the end of the trail.
export const trailUrlCard = {
  domain: 'www.example.com',
  title: 'Title of this card',
  description:
    'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
  libraryCount: 22,
  connectionCount: 22,
};
