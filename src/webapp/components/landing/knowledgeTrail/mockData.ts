/**
 * Static mock data for the decorative "Knowledge Trail" landing section.
 * Nothing here is fetched or persisted — it only feeds the presentational
 * trail cards so the composition mirrors the real product UI without touching
 * the API. Mirrors the approach used by `orbitalHero/mockData.ts`.
 */

// "See who shares your interest" — mirrors the URL page's "Added by" tab
// (ProfileCard rows): curators who saved the same link, each with the relative
// time they added it and, like the real card, an occasional "Follows you"
// badge. Avatars are pre-generated boringavatars.com SVGs (the initial/color
// act as the fallback while the image loads). Handles use whimsical TLDs that
// don't exist (checked against the IANA root zone) so they read as playful
// rather than as real accounts — worth re-checking if ICANN ever mints them.
import InterestAvatarA from '@/assets/avatars/interest-a.svg';
import InterestAvatarM from '@/assets/avatars/interest-m.svg';
import InterestAvatarK from '@/assets/avatars/interest-k.svg';
import YouAvatar from '@/assets/avatars/you.svg';

export const interestCurators = [
  {
    name: 'Amara Okafor',
    handle: 'amara.rabbithole',
    addedAt: '2h ago',
    followsYou: false,
    initial: 'A',
    color: '#2F9E44',
    src: InterestAvatarA.src,
  },
  {
    name: 'Mateo Rivera',
    handle: 'mateo.treehouse',
    addedAt: '1d ago',
    followsYou: false,
    initial: 'M',
    color: '#1e4dd9',
    src: InterestAvatarM.src,
  },
  {
    name: 'Keiko Tanaka',
    handle: 'keiko.moonbase',
    addedAt: '3d ago',
    followsYou: true,
    initial: 'K',
    color: '#9C36B5',
    src: InterestAvatarK.src,
  },
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

// "Follow the thoughtful connections others have made" — a mini stand-in for the
// real Add-Connection form: two links joined by a connection type, with the type
// picker shown open and the curator's note filled in. Reuses the Google favicon
// service for each link's real favicon. `activeType` must match a value in
// CONNECTION_TYPES.
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
  note: "You can't rewild the web without more gardeners. Maggie's guide lowers the barrier for the non-technical ones.",
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

// The glowing URL card at the end of the trail. The note mirrors
// NoteCardInline on a real UrlCard — it's YOUR note (the viewer's), the kind
// of note-to-self you'd leave when saving the link to your library.
export const trailUrlCard = {
  domain: 'anil.recoil.org',
  title: 'Rewilding the Web: my workshop report from Edinburgh',
  description:
    "Notes from a wonderfully interdisciplinary Edinburgh workshop on 'Rewilding the Web', ranging coopetition and biological variety through the philosophy of self-organisation, polycrisis governance, protopian science fiction, and moderation seen through the lens of artisanal cheese.",
  imageUrl: 'https://anil.recoil.org/images/rewilding-web-ed-6.640.webp',
  libraryCount: 3,
  connectionCount: 5,
  note: {
    author: {
      name: 'You',
      initial: 'Y',
      color: '#F76707',
      src: YouAvatar.src,
    },
    text: "Humpbacks turned bubble-play into a hunting technique — Nave's case that 'useless' variety is what resilience is made of. Best argument yet against optimising all the play out of a network.",
  },
};
