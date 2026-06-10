import { z } from 'zod';
import { UserSchema } from './user';
import { UrlCardSchema } from './card';
import { CollectionSchema } from './collection';
import { ConnectionWithSourceAndTargetSchema } from './connection';

export enum NotificationType {
  USER_ADDED_YOUR_CARD = 'USER_ADDED_YOUR_CARD',
  USER_ADDED_YOUR_BSKY_POST = 'USER_ADDED_YOUR_BSKY_POST',
  USER_ADDED_YOUR_COLLECTION = 'USER_ADDED_YOUR_COLLECTION',
  USER_ADDED_TO_YOUR_COLLECTION = 'USER_ADDED_TO_YOUR_COLLECTION',
  USER_FOLLOWED_YOU = 'USER_FOLLOWED_YOU',
  USER_FOLLOWED_YOUR_COLLECTION = 'USER_FOLLOWED_YOUR_COLLECTION',
  USER_CONNECTED_YOUR_URL = 'USER_CONNECTED_YOUR_URL',
  USER_CONNECTED_YOUR_POST = 'USER_CONNECTED_YOUR_POST',
  USER_CONNECTED_YOUR_COLLECTION = 'USER_CONNECTED_YOUR_COLLECTION',
  SUBSCRIBED_USER_ADDED_CARD = 'SUBSCRIBED_USER_ADDED_CARD',
  USER_ADDED_CARD_TO_SUBSCRIBED_COLLECTION = 'USER_ADDED_CARD_TO_SUBSCRIBED_COLLECTION',
}
export const NotificationTypeSchema = z.enum([
  'USER_ADDED_YOUR_CARD',
  'USER_ADDED_YOUR_BSKY_POST',
  'USER_ADDED_YOUR_COLLECTION',
  'USER_ADDED_TO_YOUR_COLLECTION',
  'USER_FOLLOWED_YOU',
  'USER_FOLLOWED_YOUR_COLLECTION',
  'USER_CONNECTED_YOUR_URL',
  'USER_CONNECTED_YOUR_POST',
  'USER_CONNECTED_YOUR_COLLECTION',
  'SUBSCRIBED_USER_ADDED_CARD',
  'USER_ADDED_CARD_TO_SUBSCRIBED_COLLECTION',
]);

export const BaseNotificationItemSchema = z.object({
  id: z.string(),
  user: UserSchema,
  createdAt: z.string(),
  type: NotificationTypeSchema,
  read: z.boolean(),
});
export type BaseNotificationItem = z.infer<typeof BaseNotificationItemSchema>;

export const CardCollectionNotificationItemSchema =
  BaseNotificationItemSchema.extend({
    type: z.union([
      z.literal(NotificationType.USER_ADDED_YOUR_CARD),
      z.literal(NotificationType.USER_ADDED_YOUR_BSKY_POST),
      z.literal(NotificationType.USER_ADDED_YOUR_COLLECTION),
      z.literal(NotificationType.USER_ADDED_TO_YOUR_COLLECTION),
      z.literal(NotificationType.SUBSCRIBED_USER_ADDED_CARD),
      z.literal(NotificationType.USER_ADDED_CARD_TO_SUBSCRIBED_COLLECTION),
    ]),
    card: UrlCardSchema,
    collections: z.array(CollectionSchema).optional(),
  });
export type CardCollectionNotificationItem = z.infer<
  typeof CardCollectionNotificationItemSchema
>;

export const FollowNotificationItemSchema = BaseNotificationItemSchema.extend({
  type: z.union([
    z.literal(NotificationType.USER_FOLLOWED_YOU),
    z.literal(NotificationType.USER_FOLLOWED_YOUR_COLLECTION),
  ]),
  followTargetType: z.enum(['USER', 'COLLECTION']),
  followTargetId: z.string().optional(),
  collections: z.array(CollectionSchema).optional(),
});
export type FollowNotificationItem = z.infer<
  typeof FollowNotificationItemSchema
>;

export const ConnectionCreatedNotificationItemSchema =
  BaseNotificationItemSchema.extend({
    type: z.union([
      z.literal(NotificationType.USER_CONNECTED_YOUR_URL),
      z.literal(NotificationType.USER_CONNECTED_YOUR_POST),
      z.literal(NotificationType.USER_CONNECTED_YOUR_COLLECTION),
    ]),
    connection: ConnectionWithSourceAndTargetSchema,
  });
export type ConnectionCreatedNotificationItem = z.infer<
  typeof ConnectionCreatedNotificationItemSchema
>;

export const NotificationItemSchema = z.union([
  CardCollectionNotificationItemSchema,
  FollowNotificationItemSchema,
  ConnectionCreatedNotificationItemSchema,
]);
export type NotificationItem = z.infer<typeof NotificationItemSchema>;
