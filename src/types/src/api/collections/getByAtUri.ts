import { z } from 'zod';
import {
  PaginatedSortedParamsSchema,
  UrlTypeSchema,
} from '../../entities/common';

export const GetCollectionPageByAtUriParamsSchema =
  PaginatedSortedParamsSchema.extend({
    handle: z.string(),
    recordKey: z.string(),
    urlType: UrlTypeSchema.optional(),
  });
export type GetCollectionPageByAtUriParams = z.infer<
  typeof GetCollectionPageByAtUriParamsSchema
>;
