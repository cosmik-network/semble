export type TopicId =
  | 'science'
  | 'ai'
  | 'software-development'
  | 'community'
  | 'atproto'
  | 'social-networks'
  | 'music'
  | 'writing'
  | 'note-taking'
  | 'pkm'
  | 'politics'
  | 'curation'
  | 'product-building'
  | 'business'
  | 'nature';

export interface Topic {
  id: TopicId;
  /**
   * Sent verbatim to semantic search and persisted to localStorage. Treat as
   * frozen: changing one silently changes what a user gets recommended and
   * stops their stored pick from matching its preset.
   */
  query: string;
  /** What the user reads, so display casing can change without touching the
   * frozen search string above. */
  label: string;
}

export const TOPICS: Topic[] = [
  { id: 'science', query: 'science', label: 'Science' },
  { id: 'ai', query: 'AI', label: 'AI' },
  {
    id: 'software-development',
    query: 'software development',
    label: 'Software development',
  },
  { id: 'community', query: 'community', label: 'Community' },
  // Lowercase on purpose: that is how the protocol styles its own name.
  { id: 'atproto', query: 'atproto', label: 'atproto' },
  { id: 'social-networks', query: 'social networks', label: 'Social networks' },
  { id: 'music', query: 'music', label: 'Music' },
  { id: 'writing', query: 'writing', label: 'Writing' },
  { id: 'note-taking', query: 'note-taking', label: 'Note-taking' },
  {
    id: 'pkm',
    query: 'personal knowledge management',
    label: 'Personal knowledge management',
  },
  { id: 'politics', query: 'politics', label: 'Politics' },
  { id: 'curation', query: 'curation', label: 'Curation' },
  {
    id: 'product-building',
    query: 'product building',
    label: 'Product building',
  },
  { id: 'business', query: 'business', label: 'Business' },
  { id: 'nature', query: 'nature', label: 'Nature' },
];

export const PRESET_TOPICS = TOPICS.map((topic) => topic.query);

// Applied when someone skips stage 1, so stages 2 and 3 still have input.
export const FALLBACK_TOPICS = [
  'science',
  'AI',
  'personal knowledge management',
  'curation',
  'social networks',
];
