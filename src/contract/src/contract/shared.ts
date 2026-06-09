import { z } from 'zod';
import {
  CardSortFieldSchema,
  CollectionSortFieldSchema,
  ConnectionSortFieldSchema,
  SortOrderSchema,
} from '@semble/types';

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

export const CoercedPaginatedCardSortedQuery = CoercedPaginationQuery.extend({
  sortBy: CardSortFieldSchema.optional(),
  sortOrder: SortOrderSchema.optional(),
});

export const CoercedPaginatedCollectionSortedQuery =
  CoercedPaginationQuery.extend({
    sortBy: CollectionSortFieldSchema.optional(),
    sortOrder: SortOrderSchema.optional(),
  });

export const CoercedPaginatedConnectionSortedQuery =
  CoercedPaginationQuery.extend({
    sortBy: ConnectionSortFieldSchema.optional(),
    sortOrder: SortOrderSchema.optional(),
  });
