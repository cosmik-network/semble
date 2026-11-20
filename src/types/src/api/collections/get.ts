import { z } from 'zod';
import {
  PaginatedCardSortedParamsSchema,
  PaginationSchema,
  CardSortingSchema,
  UrlTypeSchema,
} from '../../entities/common';
import { CollectionSchema } from '../../entities/collection';
import { CardItemSchema } from '../../entities/card';
import { CardTypesParamSchema } from '../cards/listMine';

export const GetCollectionPageParamsSchema =
  PaginatedCardSortedParamsSchema.extend({
    urlType: UrlTypeSchema.optional(),
    cardTypes: CardTypesParamSchema,
  });
export type GetCollectionPageParams = z.infer<
  typeof GetCollectionPageParamsSchema
>;

export const GetCollectionPageResponseSchema = CollectionSchema.extend({
  // Field kept as `urlCards` for wire compatibility; items are a card-type
  // union discriminated by `type`
  urlCards: z.array(CardItemSchema),
  pagination: PaginationSchema,
  sorting: CardSortingSchema,
});
export type GetCollectionPageResponse = z.infer<
  typeof GetCollectionPageResponseSchema
>;
