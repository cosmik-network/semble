import { z } from 'zod';
import {
  PaginationParamsSchema,
  PaginationSchema,
} from '../../entities/common';
import { UserSchema } from '../../entities/user';

export const GetBskyFollowedUsersParamsSchema = PaginationParamsSchema;
export type GetBskyFollowedUsersParams = z.infer<
  typeof GetBskyFollowedUsersParamsSchema
>;

export const GetBskyFollowedUsersResponseSchema = z.object({
  users: z.array(UserSchema),
  pagination: PaginationSchema,
});
export type GetBskyFollowedUsersResponse = z.infer<
  typeof GetBskyFollowedUsersResponseSchema
>;

export const FollowManyUsersRequestSchema = z.object({
  targetIds: z.array(z.string()).min(1).max(1000),
});
export type FollowManyUsersRequest = z.infer<
  typeof FollowManyUsersRequestSchema
>;

export const FollowManyUsersResponseSchema = z.object({
  followedCount: z.number(),
  alreadyFollowingCount: z.number(),
});
export type FollowManyUsersResponse = z.infer<
  typeof FollowManyUsersResponseSchema
>;
