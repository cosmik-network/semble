import { z } from 'zod';
import {
  PaginatedSortedParamsSchema,
  CollectionAccessTypeSchema,
} from '../../entities/common';

export const SearchCollectionsParamsSchema = PaginatedSortedParamsSchema.extend(
  {
    searchText: z.string().optional(),
    identifier: z.string().optional(),
    accessType: CollectionAccessTypeSchema.optional(),
  },
);
export type SearchCollectionsParams = z.infer<
  typeof SearchCollectionsParamsSchema
>;
