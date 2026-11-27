import { z } from 'zod';
import { UserSchema } from './user';
import { UrlCardSchema, AnnotationCardSchema } from './card';
import { CollectionSchema } from './collection';
import {
  UrlConnectionEndpointSchema,
  CardConnectionEndpointSchema,
} from './connection';

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
  USER_CONNECTED_YOUR_ANNOTATION = 'USER_CONNECTED_YOUR_ANNOTATION',
  USER_ANNOTATED_YOUR_URL = 'USER_ANNOTATED_YOUR_URL',
  SUBSCRIBED_USER_ADDED_CARD = 'SUBSCRIBED_USER_ADDED_CARD',
  SUBSCRIBED_USER_ANNOTATED_URL = 'SUBSCRIBED_USER_ANNOTATED_URL',
  USER_ADDED_CARD_TO_SUBSCRIBED_COLLECTION = 'USER_ADDED_CARD_TO_SUBSCRIBED_COLLECTION',
  SUBSCRIBED_USER_MADE_CONNECTION = 'SUBSCRIBED_USER_MADE_CONNECTION',
  USER_ADDED_SUBSCRIBED_COLLECTION = 'USER_ADDED_SUBSCRIBED_COLLECTION',
  USER_CONNECTED_SUBSCRIBED_COLLECTION = 'USER_CONNECTED_SUBSCRIBED_COLLECTION',
  USER_MENTIONED_YOU = 'USER_MENTIONED_YOU',
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
  'USER_CONNECTED_YOUR_ANNOTATION',
  'USER_ANNOTATED_YOUR_URL',
  'SUBSCRIBED_USER_ADDED_CARD',
  'SUBSCRIBED_USER_ANNOTATED_URL',
  'USER_ADDED_CARD_TO_SUBSCRIBED_COLLECTION',
  'SUBSCRIBED_USER_MADE_CONNECTION',
  'USER_ADDED_SUBSCRIBED_COLLECTION',
  'USER_CONNECTED_SUBSCRIBED_COLLECTION',
  'USER_MENTIONED_YOU',
]);

export const MentionSourceSchema = z.enum([
  'NOTE',
  'CONNECTION',
  'COLLECTION',
  'ANNOTATION',
]);
export type MentionSource = z.infer<typeof MentionSourceSchema>;

export const BaseNotificationItemSchema = z.object({
  id: z.string(),
  user: UserSchema,
  createdAt: z.string(),
  type: NotificationTypeSchema,
  read: z.boolean(),
});
export type BaseNotificationItem = z.infer<typeof BaseNotificationItemSchema>;

// Notification cards can be URL cards or annotation cards — the same
// discriminated union card lists use.
export const NotificationCardSchema = z.discriminatedUnion('type', [
  UrlCardSchema,
  AnnotationCardSchema,
]);
export type NotificationCard = z.infer<typeof NotificationCardSchema>;

export const CardCollectionNotificationItemSchema =
  BaseNotificationItemSchema.extend({
    type: z.union([
      z.literal(NotificationType.USER_ADDED_YOUR_CARD),
      z.literal(NotificationType.USER_ADDED_YOUR_BSKY_POST),
      z.literal(NotificationType.USER_ADDED_YOUR_COLLECTION),
      z.literal(NotificationType.USER_ADDED_TO_YOUR_COLLECTION),
      z.literal(NotificationType.SUBSCRIBED_USER_ADDED_CARD),
      z.literal(NotificationType.USER_ADDED_CARD_TO_SUBSCRIBED_COLLECTION),
      z.literal(NotificationType.USER_ADDED_SUBSCRIBED_COLLECTION),
    ]),
    card: NotificationCardSchema,
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

// Connection endpoints on notifications — URL endpoints carry the viewer's
// engagement stats, CARD endpoints carry the annotation card in full.
export const NotificationUrlEndpointSchema = UrlConnectionEndpointSchema.extend(
  {
    urlLibraryCount: z.number(),
    urlInLibrary: z.boolean().optional(),
    urlConnectionCount: z.number().optional(),
    urlIsConnected: z.boolean().optional(),
  },
);
export type NotificationUrlEndpoint = z.infer<
  typeof NotificationUrlEndpointSchema
>;

export const NotificationConnectionEndpointSchema = z.discriminatedUnion(
  'type',
  [NotificationUrlEndpointSchema, CardConnectionEndpointSchema],
);
export type NotificationConnectionEndpoint = z.infer<
  typeof NotificationConnectionEndpointSchema
>;

export const NotificationConnectionSchema = z.object({
  connection: z.object({
    id: z.string(),
    type: z.string().optional(),
    note: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    curator: UserSchema,
  }),
  source: NotificationConnectionEndpointSchema,
  target: NotificationConnectionEndpointSchema,
});
export type NotificationConnection = z.infer<
  typeof NotificationConnectionSchema
>;

export const ConnectionCreatedNotificationItemSchema =
  BaseNotificationItemSchema.extend({
    type: z.union([
      z.literal(NotificationType.USER_CONNECTED_YOUR_URL),
      z.literal(NotificationType.USER_CONNECTED_YOUR_POST),
      z.literal(NotificationType.USER_CONNECTED_YOUR_COLLECTION),
      z.literal(NotificationType.USER_CONNECTED_YOUR_ANNOTATION),
      z.literal(NotificationType.SUBSCRIBED_USER_MADE_CONNECTION),
      z.literal(NotificationType.USER_CONNECTED_SUBSCRIBED_COLLECTION),
    ]),
    connection: NotificationConnectionSchema,
  });
export type ConnectionCreatedNotificationItem = z.infer<
  typeof ConnectionCreatedNotificationItemSchema
>;

// Mention notification: exactly one of card/connection/collection is set,
// matching mentionSource.
export const MentionNotificationItemSchema = BaseNotificationItemSchema.extend({
  type: z.literal(NotificationType.USER_MENTIONED_YOU),
  mentionSource: MentionSourceSchema,
  card: NotificationCardSchema.optional(),
  connection: NotificationConnectionSchema.optional(),
  mentionCollection: CollectionSchema.optional(),
});
export type MentionNotificationItem = z.infer<
  typeof MentionNotificationItemSchema
>;

// Batched "user annotated a url" notifications — annotations created by the
// same actor on the same URL within a window collapse into one item. Covers
// both the library-based (your URL) and subscription-based variants.
export const AnnotationBatchNotificationItemSchema =
  BaseNotificationItemSchema.extend({
    type: z.union([
      z.literal(NotificationType.USER_ANNOTATED_YOUR_URL),
      z.literal(NotificationType.SUBSCRIBED_USER_ANNOTATED_URL),
    ]),
    url: z.string(),
    annotations: z.array(AnnotationCardSchema),
  });
export type AnnotationBatchNotificationItem = z.infer<
  typeof AnnotationBatchNotificationItemSchema
>;

export const NotificationItemSchema = z.union([
  CardCollectionNotificationItemSchema,
  FollowNotificationItemSchema,
  ConnectionCreatedNotificationItemSchema,
  MentionNotificationItemSchema,
  AnnotationBatchNotificationItemSchema,
]);
export type NotificationItem = z.infer<typeof NotificationItemSchema>;
