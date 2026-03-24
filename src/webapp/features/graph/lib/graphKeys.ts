/**
 * Query key factory for graph-related queries
 * Following the pattern from other features (cards, collections, etc.)
 */
export const graphKeys = {
  all: () => ['graph'] as const,
  data: () => [...graphKeys.all(), 'data'] as const,
  page: (page: number) => [...graphKeys.all(), 'page', page] as const,
  user: (identifier: string) =>
    [...graphKeys.all(), 'user', identifier] as const,
  userPage: (identifier: string, page: number) =>
    [...graphKeys.all(), 'user', identifier, 'page', page] as const,
  node: (nodeId: string) => [...graphKeys.all(), 'node', nodeId] as const,
} as const;
