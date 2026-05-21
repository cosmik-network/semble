import { z } from 'zod';

export const ErrorResponseSchema = z.object({
  message: z.string(),
  code: z.string().optional(),
});

export const CoercedPaginationQuery = z.object({
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
});

export const CoercedSortingQuery = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const CoercedPaginatedSortedQuery =
  CoercedPaginationQuery.merge(CoercedSortingQuery);
