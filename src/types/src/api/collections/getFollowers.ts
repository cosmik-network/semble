import { z } from 'zod';
import {
  PaginationParamsSchema,
  PaginationSchema,
} from '../../entities/common';
import { UserSchema } from '../../entities/user';

export const GetCollectionFollowersParamsSchema = PaginationParamsSchema.extend(
  {
    collectionId: z.string(),
  },
);
export type GetCollectionFollowersParams = z.infer<
  typeof GetCollectionFollowersParamsSchema
>;

export const GetCollectionFollowersResponseSchema = z.object({
  users: z.array(UserSchema),
  pagination: PaginationSchema,
});
export type GetCollectionFollowersResponse = z.infer<
  typeof GetCollectionFollowersResponseSchema
>;

export const GetCollectionFollowersCountParamsSchema = z.object({
  collectionId: z.string(),
});
export type GetCollectionFollowersCountParams = z.infer<
  typeof GetCollectionFollowersCountParamsSchema
>;

export const GetFollowCountResponseSchema = z.object({
  count: z.number(),
});
export type GetFollowCountResponse = z.infer<
  typeof GetFollowCountResponseSchema
>;
