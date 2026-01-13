export const searchKeys = {
  all: () => ['search'] as const,
  semanticSearch: (query: string) =>
    [...searchKeys.all(), 'semantic', query] as const,
  semanticSearchInfinite: (
    query: string,
    limit?: number,
    threshold?: number,
    urlType?: string,
    userId?: string,
  ) =>
    [
      ...searchKeys.semanticSearch(query),
      'infinite',
      limit,
      threshold,
      urlType,
      userId,
    ] as const,
};
