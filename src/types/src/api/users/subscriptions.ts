import { z } from 'zod';
import {
  PaginationParamsSchema,
  PaginationSchema,
} from '../../entities/common';
import { UserSchema } from '../../entities/user';
import { CollectionSchema } from '../../entities/collection';

export const SubscribeToTargetRequestSchema = z.object({
  targetId: z.string(),
  targetType: z.enum(['USER', 'COLLECTION']),
});
export type SubscribeToTargetRequest = z.infer<
  typeof SubscribeToTargetRequestSchema
>;

export const SubscribeToTargetResponseSchema = z.object({
  followId: z.string(),
  subscribedAt: z.string(),
});
export type SubscribeToTargetResponse = z.infer<
  typeof SubscribeToTargetResponseSchema
>;

export const UnsubscribeFromTargetRequestSchema = z.object({
  targetId: z.string(),
  targetType: z.enum(['USER', 'COLLECTION']),
});
export type UnsubscribeFromTargetRequest = z.infer<
  typeof UnsubscribeFromTargetRequestSchema
>;

export const GetMySubscriptionsParamsSchema = PaginationParamsSchema.extend({
  targetType: z.enum(['USER', 'COLLECTION']).optional(),
});
export type GetMySubscriptionsParams = z.infer<
  typeof GetMySubscriptionsParamsSchema
>;

export const SubscriptionItemSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('USER'),
    user: UserSchema,
    subscribedAt: z.string(),
  }),
  z.object({
    type: z.literal('COLLECTION'),
    collection: CollectionSchema,
    subscribedAt: z.string(),
  }),
]);
export type SubscriptionItem = z.infer<typeof SubscriptionItemSchema>;

export const GetMySubscriptionsResponseSchema = z.object({
  items: z.array(SubscriptionItemSchema),
  pagination: PaginationSchema,
});
export type GetMySubscriptionsResponse = z.infer<
  typeof GetMySubscriptionsResponseSchema
>;
