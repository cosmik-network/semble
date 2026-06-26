/**
 * User IDs (DIDs) to exclude from all product analytics queries.
 *
 * Use this to filter out internal/test accounts so they don't skew metrics
 * such as WAC and the activation funnel.
 */
export const EXCLUDED_ANALYTICS_USER_IDS: readonly string[] = [
  'did:plc:6z5botgrc5vekq7j26xnvawq', // @wesleyfinck.org
  'did:plc:3sapfnszmvjc6wa4ml3ybkwb', // @pouriade.com
  'did:plc:rtf3bjc3w2yn4syxtm4r7jt2', // @ronentk.me
  'did:plc:b2p6rujcgpenbtcjposmjuc3', // @cosmik.network
  'did:plc:k7wclckeajmuibxbamtbejjg', // @semble.so
  'did:plc:rlknsba2qldjkicxsmni3vyn', // @cosmiktesting.bsky.social
  'did:plc:rnnz5odw3v5zab4zhmexkxi6', // @sembot.bsky.social
];
