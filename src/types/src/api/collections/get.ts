import { z } from 'zod';
import {
  PaginatedCardSortedParamsSchema,
  PaginationSchema,
  CardSortingSchema,
  UrlTypeSchema,
} from '../../entities/common';
import { CollectionSchema } from '../../entities/collection';
import { UrlCardSchema } from '../../entities/card';

export const GetCollectionPageParamsSchema =
  PaginatedCardSortedParamsSchema.extend({
    urlType: UrlTypeSchema.optional(),
  });
export type GetCollectionPageParams = z.infer<
  typeof GetCollectionPageParamsSchema
>;

export const GetCollectionPageResponseSchema = CollectionSchema.extend({
  urlCards: z.array(UrlCardSchema),
  pagination: PaginationSchema,
  sorting: CardSortingSchema,
});
export type GetCollectionPageResponse = z.infer<
  typeof GetCollectionPageResponseSchema
>;
