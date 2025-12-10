import {
  pgTable,
  text,
  timestamp,
  jsonb,
  uuid,
  boolean,
  index,
} from 'drizzle-orm/pg-core';

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

      // For unread count queries
      recipientReadIdx: index('notifications_recipient_read_idx').on(
        table.recipientUserId,
        table.read,
      ),
    };
  },
);
