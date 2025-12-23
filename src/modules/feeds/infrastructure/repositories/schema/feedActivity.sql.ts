import {
  pgTable,
  text,
  timestamp,
  jsonb,
  uuid,
  index,
} from 'drizzle-orm/pg-core';

export const feedActivities = pgTable(
  'feed_activities',
  {
    id: uuid('id').primaryKey(),
    actorId: text('actor_id').notNull(), // The DID of the user who performed the activity
    type: text('type').notNull(), // The type of activity (e.g., 'CARD_COLLECTED')
    metadata: jsonb('metadata').notNull(), // Activity-specific metadata
    urlType: text('url_type'), // Optional URL type from the card
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    // Index for filtering by activity type
    typeIdx: index('feed_activities_type_idx').on(table.type),
    // Index for filtering by URL type
    urlTypeIdx: index('feed_activities_url_type_idx').on(table.urlType),
    // Index for sorting by creation date (most recent first)
    createdAtIdx: index('feed_activities_created_at_idx').on(
      table.createdAt.desc(),
    ),
    // Composite index for common query patterns (type + createdAt)
    typeCreatedAtIdx: index('feed_activities_type_created_at_idx').on(
      table.type,
      table.createdAt.desc(),
    ),
    // Composite index for URL type filtering with date sorting
    urlTypeCreatedAtIdx: index('feed_activities_url_type_created_at_idx').on(
      table.urlType,
      table.createdAt.desc(),
    ),
    // Composite index for filtering by both type and URL type with date sorting
    typeUrlTypeCreatedAtIdx: index(
      'feed_activities_type_url_type_created_at_idx',
    ).on(table.type, table.urlType, table.createdAt.desc()),
  }),
);
