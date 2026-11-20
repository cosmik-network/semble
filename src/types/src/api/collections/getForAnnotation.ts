import { z } from 'zod';
import {
  PaginatedCollectionSortedParamsSchema,
  PaginationSchema,
  CollectionSortingSchema,
} from '../../entities/common';
import { CollectionSchema } from '../../entities/collection';

export const GetCollectionsForAnnotationParamsSchema =
  PaginatedCollectionSortedParamsSchema.extend({
    url: z.string(),
    exact: z.string(),
  });
export type GetCollectionsForAnnotationParams = z.infer<
  typeof GetCollectionsForAnnotationParamsSchema
>;

export const GetCollectionsForAnnotationResponseSchema = z.object({
  collections: z.array(CollectionSchema),
  pagination: PaginationSchema,
  sorting: CollectionSortingSchema,
});
export type GetCollectionsForAnnotationResponse = z.infer<
  typeof GetCollectionsForAnnotationResponseSchema
>;
