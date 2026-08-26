import { z } from 'zod';
import { CollectionSchema } from '../../entities/collection';

export const GetRecommendedCollectionsForUrlParamsSchema = z.object({
  url: z.string(),
  limit: z.number().optional(),
});
export type GetRecommendedCollectionsForUrlParams = z.infer<
  typeof GetRecommendedCollectionsForUrlParamsSchema
>;

/**
 * Both sets are returned together so the recommendation runs a single
 * similarity search. `myCollections` are the caller's own; `openCollections`
 * are open collections from across the network, excluding the caller's.
 */
export const GetRecommendedCollectionsForUrlResponseSchema = z.object({
  myCollections: z.array(CollectionSchema),
  openCollections: z.array(CollectionSchema),
});
export type GetRecommendedCollectionsForUrlResponse = z.infer<
  typeof GetRecommendedCollectionsForUrlResponseSchema
>;
