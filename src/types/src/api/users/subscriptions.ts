import { z } from 'zod';
import {
  PaginationParamsSchema,
  PaginationSchema,
} from '../../entities/common';
import {
  UserSchema,
  SubscriptionScopeSchema,
  type SubscriptionScope,
} from '../../entities/user';
import { CollectionSchema } from '../../entities/collection';

export { SubscriptionScopeSchema };
export type { SubscriptionScope };

export const SubscribeToTargetRequestSchema = z.object({
  targetId: z.string(),
  targetType: z.enum(['USER', 'COLLECTION']),
  scopes: z.array(SubscriptionScopeSchema).optional(),
});
export type SubscribeToTargetRequest = z.infer<
  typeof SubscribeToTargetRequestSchema
>;

export const SubscribeToTargetResponseSchema = z.object({
  followId: z.string(),
  subscribedAt: z.string(),
  scopes: z.array(SubscriptionScopeSchema),
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

export const UpdateSubscriptionRequestSchema = z.object({
  targetId: z.string(),
  targetType: z.enum(['USER', 'COLLECTION']),
  scopes: z.array(SubscriptionScopeSchema).min(1),
});
export type UpdateSubscriptionRequest = z.infer<
  typeof UpdateSubscriptionRequestSchema
>;

export const UpdateSubscriptionResponseSchema = z.object({
  followId: z.string(),
  subscribedAt: z.string(),
  scopes: z.array(SubscriptionScopeSchema),
});
export type UpdateSubscriptionResponse = z.infer<
  typeof UpdateSubscriptionResponseSchema
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
    scopes: z.array(SubscriptionScopeSchema),
  }),
  z.object({
    type: z.literal('COLLECTION'),
    collection: CollectionSchema,
    subscribedAt: z.string(),
    scopes: z.array(SubscriptionScopeSchema),
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
