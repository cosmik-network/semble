import { z } from 'zod';
import { PaginatedSortedParamsSchema } from '../../entities/common';

export const GetMyCollectionsParamsSchema = PaginatedSortedParamsSchema.extend({
  searchText: z.string().optional(),
});
export type GetMyCollectionsParams = z.infer<
  typeof GetMyCollectionsParamsSchema
>;
