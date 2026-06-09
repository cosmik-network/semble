import { z } from 'zod';
import {
  PaginatedCollectionSortedParamsSchema,
  PaginationSchema,
  CollectionSortingSchema,
} from '../../entities/common';
import { CollectionSchema } from '../../entities/collection';

export const GetCollectionsForUrlParamsSchema =
  PaginatedCollectionSortedParamsSchema.extend({
    url: z.string(),
  });
export type GetCollectionsForUrlParams = z.infer<
  typeof GetCollectionsForUrlParamsSchema
>;

export const GetCollectionsForUrlResponseSchema = z.object({
  collections: z.array(CollectionSchema),
  pagination: PaginationSchema,
  sorting: CollectionSortingSchema,
});
export type GetCollectionsForUrlResponse = z.infer<
  typeof GetCollectionsForUrlResponseSchema
>;
