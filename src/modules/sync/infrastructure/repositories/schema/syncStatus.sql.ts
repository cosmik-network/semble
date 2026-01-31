import { pgTable, text, timestamp, integer, uuid } from 'drizzle-orm/pg-core';

export const syncStatuses = pgTable('sync_statuses', {
  id: uuid('id').primaryKey().defaultRandom(),
  curatorId: text('curator_id').notNull().unique(),
  syncState: text('sync_state').notNull(),
  lastSyncedAt: timestamp('last_synced_at'),
  lastSyncAttemptAt: timestamp('last_sync_attempt_at'),
  syncErrorMessage: text('sync_error_message'),
  recordsProcessed: integer('records_processed'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
