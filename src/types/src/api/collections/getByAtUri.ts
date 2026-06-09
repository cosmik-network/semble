import { z } from 'zod';
import {
  PaginatedCardSortedParamsSchema,
  UrlTypeSchema,
} from '../../entities/common';

export const GetCollectionPageByAtUriParamsSchema =
  PaginatedCardSortedParamsSchema.extend({
    handle: z.string(),
    recordKey: z.string(),
    urlType: UrlTypeSchema.optional(),
  });
export type GetCollectionPageByAtUriParams = z.infer<
  typeof GetCollectionPageByAtUriParamsSchema
>;
