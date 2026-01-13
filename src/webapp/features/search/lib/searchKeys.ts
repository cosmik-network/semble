export const searchKeys = {
  all: () => ['search'] as const,
  semanticSearch: (query: string) =>
    [...searchKeys.all(), 'semantic', query] as const,
  semanticSearchInfinite: (query: string, limit?: number) =>
    [...searchKeys.semanticSearch(query), 'infinite', limit] as const,
};
