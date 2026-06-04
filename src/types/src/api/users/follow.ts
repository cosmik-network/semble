import { z } from 'zod';
import {
  PaginationParamsSchema,
  PaginationSchema,
} from '../../entities/common';
import { UserSchema } from '../../entities/user';
import { CollectionSchema } from '../../entities/collection';

export const FollowTargetRequestSchema = z.object({
  targetId: z.string(),
  targetType: z.enum(['USER', 'COLLECTION']),
});
export type FollowTargetRequest = z.infer<typeof FollowTargetRequestSchema>;

export const UnfollowTargetRequestSchema = z.object({
  targetId: z.string(),
  targetType: z.enum(['USER', 'COLLECTION']),
});
export type UnfollowTargetRequest = z.infer<typeof UnfollowTargetRequestSchema>;

export const FollowTargetResponseSchema = z.object({
  followId: z.string(),
});
export type FollowTargetResponse = z.infer<typeof FollowTargetResponseSchema>;

export const GetFollowingUsersParamsSchema = PaginationParamsSchema.extend({
  identifier: z.string(),
});
export type GetFollowingUsersParams = z.infer<
  typeof GetFollowingUsersParamsSchema
>;

export const GetFollowingUsersResponseSchema = z.object({
  users: z.array(UserSchema),
  pagination: PaginationSchema,
});
export type GetFollowingUsersResponse = z.infer<
  typeof GetFollowingUsersResponseSchema
>;

export const GetFollowersParamsSchema = PaginationParamsSchema.extend({
  identifier: z.string(),
});
export type GetFollowersParams = z.infer<typeof GetFollowersParamsSchema>;

export const GetFollowersResponseSchema = z.object({
  users: z.array(UserSchema),
  pagination: PaginationSchema,
});
export type GetFollowersResponse = z.infer<typeof GetFollowersResponseSchema>;

export const GetFollowingCollectionsParamsSchema =
  PaginationParamsSchema.extend({
    identifier: z.string(),
  });
export type GetFollowingCollectionsParams = z.infer<
  typeof GetFollowingCollectionsParamsSchema
>;

export const GetFollowingCollectionsResponseSchema = z.object({
  collections: z.array(CollectionSchema),
  pagination: PaginationSchema,
});
export type GetFollowingCollectionsResponse = z.infer<
  typeof GetFollowingCollectionsResponseSchema
>;

export const GetFollowingCountParamsSchema = z.object({
  identifier: z.string(),
});
export type GetFollowingCountParams = z.infer<
  typeof GetFollowingCountParamsSchema
>;

export const GetFollowersCountParamsSchema = z.object({
  identifier: z.string(),
});
export type GetFollowersCountParams = z.infer<
  typeof GetFollowersCountParamsSchema
>;

export const GetFollowingCollectionsCountParamsSchema = z.object({
  identifier: z.string(),
});
export type GetFollowingCollectionsCountParams = z.infer<
  typeof GetFollowingCollectionsCountParamsSchema
>;
