import { z } from 'zod';
import { CollectionSchema } from '../../entities/collection';

export const GetRecommendedCollectionsForUrlParamsSchema = z.object({
  url: z.string(),
  limit: z.number().optional(),
});
export type GetRecommendedCollectionsForUrlParams = z.infer<
  typeof GetRecommendedCollectionsForUrlParamsSchema
>;

export const GetRecommendedCollectionsForUrlResponseSchema = z.object({
  collections: z.array(CollectionSchema),
});
export type GetRecommendedCollectionsForUrlResponse = z.infer<
  typeof GetRecommendedCollectionsForUrlResponseSchema
>;
