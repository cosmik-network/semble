import { z } from 'zod';
import {
  PaginatedCardSortedParamsSchema,
  UrlTypeSchema,
} from '../../entities/common';
import { CardTypesParamSchema } from '../cards/listMine';

export const GetCollectionPageByAtUriParamsSchema =
  PaginatedCardSortedParamsSchema.extend({
    handle: z.string(),
    recordKey: z.string(),
    urlType: UrlTypeSchema.optional(),
    cardTypes: CardTypesParamSchema,
  });
export type GetCollectionPageByAtUriParams = z.infer<
  typeof GetCollectionPageByAtUriParamsSchema
>;
