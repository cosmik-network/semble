import { pgTable, text, timestamp, jsonb, uuid } from 'drizzle-orm/pg-core';

export const feedActivities = pgTable('feed_activities', {
  id: uuid('id').primaryKey(),
  actorId: text('actor_id').notNull(), // The DID of the user who performed the activity
  type: text('type').notNull(), // The type of activity (e.g., 'CARD_COLLECTED')
  metadata: jsonb('metadata').notNull(), // Activity-specific metadata
  urlType: text('url_type'), // Optional URL type from the card
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
