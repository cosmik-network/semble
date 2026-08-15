export type TopicId =
  | 'science'
  | 'ai'
  | 'design'
  | 'music'
  | 'social-networks'
  | 'film'
  | 'writing'
  | 'games'
  | 'community'
  | 'nature'
  | 'software-development'
  | 'politics'
  | 'curation'
  | 'note-taking'
  | 'product-building'
  | 'atproto';

export interface Topic {
  id: TopicId;
  /**
   * Sent verbatim to semantic search, and what gets persisted. Treat as frozen:
   * changing one stops a stored pick from matching its preset.
   */
  query: string;
  label: string;
}

/**
 * Order is the reading order of the tile cloud, and unlike `query` it is safe
 * to change. Broad topics first so a non-builder sees something for them before
 * the Semble-native ones; label lengths are interleaved so the rows wrap evenly.
 */
export const TOPICS: Topic[] = [
  { id: 'science', query: 'science', label: 'Science' },
  { id: 'ai', query: 'AI', label: 'AI' },
  { id: 'design', query: 'design', label: 'Design' },
  { id: 'music', query: 'music', label: 'Music' },
  { id: 'social-networks', query: 'social networks', label: 'Social networks' },
  { id: 'film', query: 'film', label: 'Film' },
  { id: 'writing', query: 'writing', label: 'Writing' },
  { id: 'games', query: 'games', label: 'Games' },
  { id: 'community', query: 'community', label: 'Community' },
  { id: 'nature', query: 'nature', label: 'Nature' },
  {
    id: 'software-development',
    query: 'software development',
    label: 'Software development',
  },
  { id: 'politics', query: 'politics', label: 'Politics' },
  { id: 'curation', query: 'curation', label: 'Curation' },
  { id: 'note-taking', query: 'note-taking', label: 'Note-taking' },
  {
    id: 'product-building',
    query: 'product building',
    label: 'Product building',
  },
  { id: 'atproto', query: 'atproto', label: 'ATProto' },
];

export const PRESET_TOPICS = TOPICS.map((topic) => topic.query);

export function normalizeTopic(topic: string): string {
  return topic.trim().toLowerCase();
}

/** First occurrence wins, so preset order and preset casing survive. */
export function dedupeTopics(topics: string[]): string[] {
  const seen = new Set<string>();

  return topics.filter((topic) => {
    const key = normalizeTopic(topic);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export const FALLBACK_TOPICS = [
  'science',
  'AI',
  'design',
  'curation',
  'social networks',
];
