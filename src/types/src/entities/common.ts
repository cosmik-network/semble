import { z } from 'zod';

export const PaginationSchema = z.object({
  currentPage: z.number(),
  totalPages: z.number(),
  totalCount: z.number(),
  hasMore: z.boolean(),
  limit: z.number(),
});
export type Pagination = z.infer<typeof PaginationSchema>;

export const FeedPaginationSchema = PaginationSchema.extend({
  nextCursor: z.string().optional(),
});
export type FeedPagination = z.infer<typeof FeedPaginationSchema>;

export const SortOrder = { ASC: 'asc', DESC: 'desc' } as const;
export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder];
export const SortOrderSchema = z.enum(['asc', 'desc']);

export const CardSortField = {
  CREATED_AT: 'createdAt',
  UPDATED_AT: 'updatedAt',
  LIBRARY_COUNT: 'libraryCount',
} as const;
export type CardSortField = (typeof CardSortField)[keyof typeof CardSortField];
export const CardSortFieldSchema = z.enum([
  'createdAt',
  'updatedAt',
  'libraryCount',
]);

export const CollectionSortField = {
  NAME: 'name',
  CREATED_AT: 'createdAt',
  UPDATED_AT: 'updatedAt',
  CARD_COUNT: 'cardCount',
  ADDED_AT: 'addedAt',
} as const;
export type CollectionSortField =
  (typeof CollectionSortField)[keyof typeof CollectionSortField];
export const CollectionSortFieldSchema = z.enum([
  'name',
  'createdAt',
  'updatedAt',
  'cardCount',
  'addedAt',
]);

export const BaseSortingSchema = z.object({
  sortOrder: SortOrderSchema,
});
export type BaseSorting = z.infer<typeof BaseSortingSchema>;

export const CardSortingSchema = BaseSortingSchema.extend({
  sortBy: CardSortFieldSchema,
});
export type CardSorting = z.infer<typeof CardSortingSchema>;

export const CollectionSortingSchema = BaseSortingSchema.extend({
  sortBy: CollectionSortFieldSchema,
});
export type CollectionSorting = z.infer<typeof CollectionSortingSchema>;

export const UrlType = {
  ARTICLE: 'article',
  LINK: 'link',
  BOOK: 'book',
  RESEARCH: 'research',
  AUDIO: 'audio',
  VIDEO: 'video',
  SOCIAL: 'social',
  EVENT: 'event',
  SOFTWARE: 'software',
} as const;
export type UrlType = (typeof UrlType)[keyof typeof UrlType];
export const UrlTypeSchema = z.enum([
  'article',
  'link',
  'book',
  'research',
  'audio',
  'video',
  'social',
  'event',
  'software',
]);

export const ActivitySource = {
  MARGIN: 'margin',
  SEMBLE: 'semble',
} as const;
export type ActivitySource =
  (typeof ActivitySource)[keyof typeof ActivitySource];
export const ActivitySourceSchema = z.enum(['margin', 'semble']);

export const CollectionAccessType = {
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
} as const;
export type CollectionAccessType =
  (typeof CollectionAccessType)[keyof typeof CollectionAccessType];
export const CollectionAccessTypeSchema = z.enum(['OPEN', 'CLOSED']);

export const PaginationParamsSchema = z.object({
  page: z.number().optional(),
  limit: z.number().optional(),
});
export type PaginationParams = z.infer<typeof PaginationParamsSchema>;

export const SortingParamsSchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});
export type SortingParams = z.infer<typeof SortingParamsSchema>;

export const PaginatedSortedParamsSchema =
  PaginationParamsSchema.merge(SortingParamsSchema);
export type PaginatedSortedParams = z.infer<typeof PaginatedSortedParamsSchema>;

export const ConnectionSortingSchema = z.object({
  sortBy: z.string(),
  sortOrder: z.enum(['asc', 'desc']),
});
export type ConnectionSorting = z.infer<typeof ConnectionSortingSchema>;
