import { z } from 'zod';
import { UserSchema } from './user';
import { UrlCardSchema } from './card';
import { CollectionSchema } from './collection';
import { ConnectionWithSourceAndTargetSchema } from './connection';

export enum ActivityType {
  CARD_COLLECTED = 'CARD_COLLECTED',
  CONNECTION_CREATED = 'CONNECTION_CREATED',
}
export const ActivityTypeSchema = z.enum([
  'CARD_COLLECTED',
  'CONNECTION_CREATED',
]);

export const BaseFeedItemSchema = z.object({
  id: z.string(),
  user: UserSchema,
  createdAt: z.date(),
});
export type BaseFeedItem = z.infer<typeof BaseFeedItemSchema>;

export const CardCollectedFeedItemSchema = BaseFeedItemSchema.extend({
  activityType: z.literal(ActivityType.CARD_COLLECTED),
  card: UrlCardSchema,
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

export const FeedItemSchema = z.union([
  CardCollectedFeedItemSchema,
  ConnectionCreatedFeedItemSchema,
]);
export type FeedItem = z.infer<typeof FeedItemSchema>;
