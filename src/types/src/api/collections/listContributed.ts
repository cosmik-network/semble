import { z } from 'zod';
import { PaginatedSortedParamsSchema } from '../../entities/common';

export const GetOpenCollectionsWithContributorParamsSchema =
  PaginatedSortedParamsSchema.extend({
    identifier: z.string(),
  });
export type GetOpenCollectionsWithContributorParams = z.infer<
  typeof GetOpenCollectionsWithContributorParamsSchema
>;
