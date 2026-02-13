import {
  pgTable,
  text,
  timestamp,
  primaryKey,
  index,
  uuid,
} from 'drizzle-orm/pg-core';
import { publishedRecords } from '../../../../cards/infrastructure/repositories/schema/publishedRecord.sql';

export const follows = pgTable(
  'follows',
  {
    followerId: text('follower_id').notNull(),
    targetId: text('target_id').notNull(),
    targetType: text('target_type').notNull(),
    publishedRecordId: uuid('published_record_id').references(
      () => publishedRecords.id,
    ),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.followerId, table.targetId, table.targetType],
    }),
    followerIdx: index('idx_follows_follower').on(table.followerId),
    targetIdx: index('idx_follows_target').on(table.targetId, table.targetType),
  }),
);
