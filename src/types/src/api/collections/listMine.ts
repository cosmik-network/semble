import { z } from 'zod';
import { PaginatedCollectionSortedParamsSchema } from '../../entities/common';

export const GetMyCollectionsParamsSchema =
  PaginatedCollectionSortedParamsSchema.extend({
    searchText: z.string().optional(),
  });
export type GetMyCollectionsParams = z.infer<
  typeof GetMyCollectionsParamsSchema
>;
