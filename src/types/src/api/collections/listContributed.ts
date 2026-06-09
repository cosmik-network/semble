import { z } from 'zod';
import { PaginatedCollectionSortedParamsSchema } from '../../entities/common';

export const GetOpenCollectionsWithContributorParamsSchema =
  PaginatedCollectionSortedParamsSchema.extend({
    identifier: z.string(),
  });
export type GetOpenCollectionsWithContributorParams = z.infer<
  typeof GetOpenCollectionsWithContributorParamsSchema
>;
