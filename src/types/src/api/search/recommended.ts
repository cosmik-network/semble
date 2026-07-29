import { z } from 'zod';
import { UrlViewSchema } from '../../entities/connection';
import { UserSchema } from '../../entities/user';
import { CollectionSchema } from '../../entities/collection';

export const RecommendedUrlsParamsSchema = z.object({
  queries: z.array(z.string()),
});
export type RecommendedUrlsParams = z.infer<typeof RecommendedUrlsParamsSchema>;

export const RecommendedUrlsResponseSchema = z.object({
  urls: z.array(UrlViewSchema),
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
  urls: z.array(z.string()),
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
