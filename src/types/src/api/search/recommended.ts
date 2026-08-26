import { z } from 'zod';
import { UrlViewSchema } from '../../entities/connection';
import { UserSchema } from '../../entities/user';
import { CollectionSchema } from '../../entities/collection';
import { PaginationSchema, UrlTypeSchema } from '../../entities/common';

export const RecommendedUrlsParamsSchema = z.object({
  queries: z.array(z.string()).optional(),
  page: z.number().optional(),
  limit: z.number().optional(),
  // Ranking weight overrides. Omitted values fall back to the server defaults.
  // Distinct weights produce a distinct cached ranked set.
  urlCardWeight: z.number().optional(),
  noteWeight: z.number().optional(),
  collectionWeight: z.number().optional(),
  connectionWeight: z.number().optional(),
  randomness: z.number().optional(),
  // Restricts recommendations to URLs of this type. Changing it re-queries the
  // vector database instead of reusing the cached ranked set.
  urlType: UrlTypeSchema.optional(),
});
export type RecommendedUrlsParams = z.infer<typeof RecommendedUrlsParamsSchema>;

export const RecommendedUrlsResponseSchema = z.object({
  urls: z.array(UrlViewSchema),
  // The query strings actually used for the recommendation. When called with
  // no queries the server derives them; pass these back on subsequent pages so
  // pagination reads from the same cached ranked set.
  queries: z.array(z.string()),
  pagination: PaginationSchema,
});
export type RecommendedUrlsResponse = z.infer<
  typeof RecommendedUrlsResponseSchema
>;

export const RecommendedUserSchema = UserSchema.extend({
  followsOnBsky: z.boolean(),
});
export type RecommendedUser = z.infer<typeof RecommendedUserSchema>;

export const RecommendedUsersParamsSchema = z.object({
  urls: z.array(z.string()),
});
export type RecommendedUsersParams = z.infer<
  typeof RecommendedUsersParamsSchema
>;

export const RecommendedUsersResponseSchema = z.object({
  users: z.array(RecommendedUserSchema),
  bskyFollowedSembleUserCount: z.number(),
});
export type RecommendedUsersResponse = z.infer<
  typeof RecommendedUsersResponseSchema
>;

export const RecommendedCollectionSchema = CollectionSchema.extend({
  authorFollowedOnBsky: z.boolean(),
});
export type RecommendedCollection = z.infer<typeof RecommendedCollectionSchema>;

export const RecommendedCollectionsParamsSchema = z.object({
  // Required when authenticated. Unauthenticated callers may omit this, in
  // which case seed URLs are drawn from random recent global feed cards.
  urls: z.array(z.string()).optional(),
});
export type RecommendedCollectionsParams = z.infer<
  typeof RecommendedCollectionsParamsSchema
>;

export const RecommendedCollectionsResponseSchema = z.object({
  collections: z.array(RecommendedCollectionSchema),
});
export type RecommendedCollectionsResponse = z.infer<
  typeof RecommendedCollectionsResponseSchema
>;
