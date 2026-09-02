export const tagKeys = {
  all: () => ['tags'] as const,
  list: (q?: string, limit?: number) =>
    [...tagKeys.all(), 'list', q ?? '', limit] as const,
  items: (tag: string) => [...tagKeys.all(), 'items', tag] as const,
  itemsInfinite: (
    tag: string,
    itemType: string,
    user?: string,
    limit?: number,
  ) =>
    [...tagKeys.items(tag), 'infinite', itemType, user ?? '', limit] as const,
};
