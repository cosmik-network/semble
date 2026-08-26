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

export const GetRecommendedOpenCollectionsForUrlParamsSchema = z.object({
  url: z.string(),
  limit: z.number().optional(),
});
export type GetRecommendedOpenCollectionsForUrlParams = z.infer<
  typeof GetRecommendedOpenCollectionsForUrlParamsSchema
>;

export const GetRecommendedOpenCollectionsForUrlResponseSchema = z.object({
  collections: z.array(CollectionSchema),
});
export type GetRecommendedOpenCollectionsForUrlResponse = z.infer<
  typeof GetRecommendedOpenCollectionsForUrlResponseSchema
>;
