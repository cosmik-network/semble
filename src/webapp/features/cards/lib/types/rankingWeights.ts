// Ranking weights for recommended cards. These mirror the server's
// RecommendationRankingConfig defaults; the server still applies its own
// fallbacks for anything omitted.
export interface RankingWeights {
  urlCardWeight: number;
  noteWeight: number;
  collectionWeight: number;
  connectionWeight: number;
  // 0 = fully deterministic ranking, 1 = maximum jitter
  randomness: number;
}

export const DEFAULT_RANKING_WEIGHTS: RankingWeights = {
  urlCardWeight: 2,
  noteWeight: 1,
  collectionWeight: 3,
  connectionWeight: 4,
  randomness: 0.5,
};

export const RANKING_WEIGHT_FIELDS: {
  key: keyof RankingWeights;
  label: string;
  step: number;
  min: number;
  max?: number;
}[] = [
  { key: 'urlCardWeight', label: 'Saves', step: 1, min: 0 },
  { key: 'noteWeight', label: 'Notes', step: 1, min: 0 },
  { key: 'collectionWeight', label: 'Collections', step: 1, min: 0 },
  { key: 'connectionWeight', label: 'Connections', step: 1, min: 0 },
  { key: 'randomness', label: 'Randomness', step: 0.1, min: 0, max: 1 },
];
