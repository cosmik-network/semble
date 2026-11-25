import { z } from 'zod';
import { UserSchema } from './user';
import { AnnotationCardSchema, UrlCardSchema } from './card';
import { CollectionSchema } from './collection';
import { ConnectionWithSourceAndTargetSchema } from './connection';

export enum ActivityType {
  CARD_COLLECTED = 'CARD_COLLECTED',
  CONNECTION_CREATED = 'CONNECTION_CREATED',
  USER_ANNOTATED_URL = 'USER_ANNOTATED_URL',
}
export const ActivityTypeSchema = z.enum([
  'CARD_COLLECTED',
  'CONNECTION_CREATED',
  'USER_ANNOTATED_URL',
]);

export const BaseFeedItemSchema = z.object({
  id: z.string(),
  user: UserSchema,
  createdAt: z.date(),
});
export type BaseFeedItem = z.infer<typeof BaseFeedItemSchema>;

// The collected card can be a URL card or an annotation card (discriminated
// on `type`)
export const CollectedCardSchema = z.union([
  UrlCardSchema,
  AnnotationCardSchema,
]);
export type CollectedCard = z.infer<typeof CollectedCardSchema>;

export const CardCollectedFeedItemSchema = BaseFeedItemSchema.extend({
  activityType: z.literal(ActivityType.CARD_COLLECTED),
  card: CollectedCardSchema,
  collections: z.array(CollectionSchema),
});
export type CardCollectedFeedItem = z.infer<typeof CardCollectedFeedItemSchema>;

export const ConnectionCreatedFeedItemSchema = BaseFeedItemSchema.extend({
  activityType: z.literal(ActivityType.CONNECTION_CREATED),
  connection: ConnectionWithSourceAndTargetSchema,
});
export type ConnectionCreatedFeedItem = z.infer<
  typeof ConnectionCreatedFeedItemSchema
>;

// Batched "user annotated a url" activity — annotations by the same actor on
// the same URL within a window collapse into one item
export const UserAnnotatedUrlFeedItemSchema = BaseFeedItemSchema.extend({
  activityType: z.literal(ActivityType.USER_ANNOTATED_URL),
  url: z.string(),
  annotations: z.array(AnnotationCardSchema),
});
export type UserAnnotatedUrlFeedItem = z.infer<
  typeof UserAnnotatedUrlFeedItemSchema
>;

export const FeedItemSchema = z.union([
  CardCollectedFeedItemSchema,
  ConnectionCreatedFeedItemSchema,
  UserAnnotatedUrlFeedItemSchema,
]);
export type FeedItem = z.infer<typeof FeedItemSchema>;
