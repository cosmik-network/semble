import { pgTable, text, timestamp, uuid, index } from 'drizzle-orm/pg-core';
import { publishedRecords } from './publishedRecord.sql';
import { cards } from './card.sql';

export const connections = pgTable(
  'connections',
  {
    id: uuid('id').primaryKey(),
    curatorId: text('curator_id').notNull(),
    sourceType: text('source_type').notNull(), // 'URL' or 'CARD'
    sourceValue: text('source_value').notNull(), // URL string or Card UUID
    targetType: text('target_type').notNull(), // 'URL' or 'CARD'
    targetValue: text('target_value').notNull(), // URL string or Card UUID
    connectionType: text('connection_type'), // SUPPORTS, OPPOSES, etc.
    note: text('note'),
    publishedRecordId: uuid('published_record_id').references(
      () => publishedRecords.id,
    ),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => {
    return {
      // Critical for querying connections by curator
      curatorIdIdx: index('connections_curator_id_idx').on(table.curatorId),

      // For finding connections from a source
      sourceIdx: index('connections_source_idx').on(
        table.sourceType,
        table.sourceValue,
      ),

      // For finding connections to a target
      targetIdx: index('connections_target_idx').on(
        table.targetType,
        table.targetValue,
      ),

      // For paginated listings
      createdAtIdx: index('connections_created_at_idx').on(
        table.createdAt.desc(),
      ),

      // Composite index for curator's connections sorted by time
      curatorCreatedAtIdx: index('connections_curator_created_at_idx').on(
        table.curatorId,
        table.createdAt.desc(),
      ),
    };
  },
);
