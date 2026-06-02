import { z } from 'zod';
import { PaginatedSortedParamsSchema } from '../../entities/common';

export const GetCollectionsParamsSchema = PaginatedSortedParamsSchema.extend({
  identifier: z.string(),
  searchText: z.string().optional(),
});
export type GetCollectionsParams = z.infer<typeof GetCollectionsParamsSchema>;
