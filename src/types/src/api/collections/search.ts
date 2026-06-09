import { z } from 'zod';
import {
  PaginatedCollectionSortedParamsSchema,
  CollectionAccessTypeSchema,
} from '../../entities/common';

export const SearchCollectionsParamsSchema =
  PaginatedCollectionSortedParamsSchema.extend({
    searchText: z.string().optional(),
    identifier: z.string().optional(),
    accessType: CollectionAccessTypeSchema.optional(),
  });
export type SearchCollectionsParams = z.infer<
  typeof SearchCollectionsParamsSchema
>;
