/**
 * Static mock data for the decorative "Knowledge Trail" landing section.
 * Nothing here is fetched or persisted — it only feeds the presentational
 * trail cards so the composition mirrors the real product UI without touching
 * the API. Mirrors the approach used by `orbitalHero/mockData.ts`.
 */

// "See who shares your interest" — overlapping avatars, each showing a stock
// person photo (the initial/color act as the fallback while the image loads).
import RandomPerson1 from '@/assets/random-person.jpeg';
import RandomPerson2 from '@/assets/random-person-2.jpeg';
import RandomPerson3 from '@/assets/random-person-3.jpeg';
import RandomPerson4 from '@/assets/random-person-4.jpeg';

export const interestAvatars = [
  { initial: 'A', color: '#2F9E44', src: RandomPerson1.src },
  { initial: 'M', color: '#1e4dd9', src: RandomPerson2.src },
  { initial: 'K', color: '#9C36B5', src: RandomPerson3.src },
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

// "Find new perspectives" — a note/annotation card. A reader's personal take on
// the "Rewilding the Web" report (https://anil.recoil.org/notes/rewilding-the-web-report).
export const perspectiveNote = {
  quote:
    "The 'rewilding' framing finally names what feels off about the platform web — we've been tending monocultures. The artisanal-cheese aside is doing more work than it looks: healthy systems need friction and slow ferment, not frictionless scale. Makes me want to compost my link hoard into something that's actually alive.",
  author: 'Ailce',
  authorInitial: 'A',
  authorColor: '#2F9E44',
  authorAvatar: RandomPerson4.src,
  createdAt: '12m ago',
};

// "Follow the thoughtful connections others have made" — a mini stand-in for the
// real Add-Connection form: two links joined by a connection type, with the type
// picker shown open. Reuses the Google favicon service for each link's real
// favicon. `activeType` must match a value in CONNECTION_TYPES.
export const connectionExample = {
  source: {
    domain: 'maggieappleton.com',
    title: 'Digital Gardening for Non-Technical Folks',
    faviconUrl: favicon('maggieappleton.com'),
  },
  target: {
    domain: 'anil.recoil.org',
    title: 'Rewilding the Web: my workshop report from Edinburgh',
    faviconUrl: favicon('anil.recoil.org'),
  },
  activeType: 'SUPPORTS',
} as const;

// "Find related collections" — a collection card. The thumbnail row shows each
// essay's real og:image preview, falling back to the title text (like
// CollectionCardPreview / HeroCollectionCard) if an image fails to load.
export const trailCollection = {
  name: 'Digital Gardens',
  subtitle: 'Ecological Media',
  cardCount: 4,
  updatedAt: 'Updated 40m ago',
  cards: [
    {
      url: 'https://www.elysian.press/p/the-internet-has-no-benches',
      title: 'The Internet has no benches',
      imageUrl:
        'https://substackcdn.com/image/fetch/$s_!u3zA!,w_1200,h_675,c_fill,f_jpg,q_auto:good,fl_progressive:steep,g_auto/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F229cb337-8eb1-4814-b575-1db3a3242aad_2688x1792.png',
    },
    {
      url: 'https://www.wayfinders.network/blog/philosophy/',
      title: 'WayFinder Philosophy',
      imageUrl: 'https://wayfinders.network/blog/philosophy/featured.jpg',
    },
  ] as { url: string; title: string; imageUrl: string }[],
};

// The glowing URL card at the end of the trail.
export const trailUrlCard = {
  domain: 'anil.recoil.org',
  title: 'Rewilding the Web: my workshop report from Edinburgh',
  description:
    "Notes from a wonderfully interdisciplinary Edinburgh workshop on 'Rewilding the Web', ranging coopetition and biological variety through the philosophy of self-organisation, polycrisis governance, protopian science fiction, and moderation seen through the lens of artisanal cheese.",
  imageUrl: 'https://anil.recoil.org/images/rewilding-web-ed-6.640.webp',
  libraryCount: 3,
  connectionCount: 5,
};
