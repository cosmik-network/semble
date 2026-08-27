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
