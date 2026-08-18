import {
  pgTable,
  text,
  integer,
  timestamp,
  uuid,
  index,
} from 'drizzle-orm/pg-core';

export const apiRequestLogs = pgTable(
  'api_request_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userDid: text('user_did').notNull(),
    method: text('method').notNull(),
    endpoint: text('endpoint').notNull(), // Route pattern, e.g. /xrpc/cards/:id
    source: text('source').notNull(), // 'mcp' | 'extension' | 'api' | future clients
    authMethod: text('auth_method').notNull(), // 'apiKey' | 'bearer-jwt'
    status: integer('status').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    createdAtIdx: index('api_request_logs_created_at_idx').on(table.createdAt),
    sourceCreatedAtIdx: index('api_request_logs_source_created_at_idx').on(
      table.source,
      table.createdAt,
    ),
    userCreatedAtIdx: index('api_request_logs_user_created_at_idx').on(
      table.userDid,
      table.createdAt,
    ),
  }),
);
