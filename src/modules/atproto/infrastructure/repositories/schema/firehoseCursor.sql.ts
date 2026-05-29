import { pgTable, text, bigint, timestamp } from 'drizzle-orm/pg-core';

export const firehoseCursors = pgTable('firehose_cursors', {
  id: text('id').primaryKey(),
  timeUs: bigint('time_us', { mode: 'number' }).notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
