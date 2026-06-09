import { z } from 'zod';
import { PaginatedCollectionSortedParamsSchema } from '../../entities/common';

export const GetCollectionsParamsSchema =
  PaginatedCollectionSortedParamsSchema.extend({
    identifier: z.string(),
    searchText: z.string().optional(),
  });
export type GetCollectionsParams = z.infer<typeof GetCollectionsParamsSchema>;
