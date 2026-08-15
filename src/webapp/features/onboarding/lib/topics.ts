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
  | 'politics'
  | 'curation'
  | 'product-building'
  | 'design'
  | 'film'
  | 'games'
  | 'nature';

export interface Topic {
  id: TopicId;
  /**
   * Sent verbatim to semantic search, and what gets persisted. Treat as frozen:
   * changing one stops a stored pick from matching its preset.
   */
  query: string;
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
  { id: 'atproto', query: 'atproto', label: 'ATProto' },
  { id: 'social-networks', query: 'social networks', label: 'Social networks' },
  { id: 'music', query: 'music', label: 'Music' },
  { id: 'writing', query: 'writing', label: 'Writing' },
  { id: 'note-taking', query: 'note-taking', label: 'Note-taking' },
  { id: 'politics', query: 'politics', label: 'Politics' },
  { id: 'curation', query: 'curation', label: 'Curation' },
  {
    id: 'product-building',
    query: 'product building',
    label: 'Product building',
  },
  { id: 'design', query: 'design', label: 'Design' },
  { id: 'film', query: 'film', label: 'Film' },
  { id: 'games', query: 'games', label: 'Games' },
  { id: 'nature', query: 'nature', label: 'Nature' },
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
