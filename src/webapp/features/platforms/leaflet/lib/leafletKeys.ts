export const leafletKeys = {
  all: () => ['leaflet'] as const,
  infinite: (limit?: number) => [...leafletKeys.all(), 'infinite', limit],
  searchDocs: (url: string, limit?: number) => [
    ...leafletKeys.infinite(limit),
    url,
  ],
};
