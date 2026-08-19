import {
  pgTable,
  text,
  timestamp,
  jsonb,
  uuid,
  boolean,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey(),
    recipientUserId: text('recipient_user_id').notNull(),
    actorUserId: text('actor_user_id').notNull(),
    type: text('type').notNull(), // NotificationTypeEnum
    metadata: jsonb('metadata').notNull(), // NotificationMetadata
    read: boolean('read').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => {
    return {
      // Critical for finding notifications by recipient
      recipientIdx: index('notifications_recipient_idx').on(
        table.recipientUserId,
      ),

      // For paginated notification queries (most common sort)
      recipientCreatedAtIdx: index('notifications_recipient_created_at_idx').on(
        table.recipientUserId,
        table.createdAt.desc(),
      ),

      // For unread count queries — only unread rows are indexed
      recipientUnreadIdx: index('notifications_recipient_unread_partial_idx')
        .on(table.recipientUserId)
        .where(sql`read = false`),

      // For cleanup queries that look up notifications by actor
      actorIdx: index('notifications_actor_idx').on(table.actorUserId),

      // For cleanup queries that filter on metadata cardId
      metadataCardIdIdx: index('notifications_metadata_card_id_idx').on(
        sql`(metadata->>'cardId')`,
      ),
    };
  },
);
