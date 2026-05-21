import { z } from 'zod';
import {
  PaginationSchema,
  CollectionSortingSchema,
} from '../../entities/common';
import { CollectionSchema } from '../../entities/collection';

export const GetCollectionsResponseSchema = z.object({
  collections: z.array(CollectionSchema),
  pagination: PaginationSchema,
  sorting: CollectionSortingSchema,
});
export type GetCollectionsResponse = z.infer<
  typeof GetCollectionsResponseSchema
>;
