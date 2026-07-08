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

// "Discover relevant content" — decorative search-results rows. The last row is
// "expanded" to show a real result title.
export const searchResults = [
  { domain: 'example.com' },
  { domain: 'example2.com' },
  { domain: 'example3.com' },
  { domain: 'example4.com', title: 'On Digital Gardens' },
];

// "Find new perspectives" — a note/annotation card.
export const perspectiveNote = {
  quote:
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla vulputate imperdiet aliquam. Proin egestas sollicitudin eros id tristique.',
  author: 'Pouria',
  authorInitial: 'P',
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
