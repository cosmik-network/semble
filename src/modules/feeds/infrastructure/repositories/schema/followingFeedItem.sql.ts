import {
  pgTable,
  text,
  timestamp,
  uuid,
  index,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { feedActivities } from './feedActivity.sql';

export const followingFeedItems = pgTable(
  'following_feed_items',
  {
    userId: text('user_id').notNull(), // DID of feed owner
    activityId: uuid('activity_id')
      .notNull()
      .references(() => feedActivities.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull(), // Denormalized from activity for sorting
  },
  (table) => ({
    // Composite primary key
    pk: primaryKey({ columns: [table.userId, table.activityId] }),
    // Index for efficient user feed queries sorted by time
    userTimeIdx: index('idx_following_feed_user_time').on(
      table.userId,
      table.createdAt.desc(),
    ),
  }),
);
