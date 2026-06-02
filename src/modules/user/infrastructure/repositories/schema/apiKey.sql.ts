import { pgTable, text, timestamp, boolean, index } from 'drizzle-orm/pg-core';
import { users } from './user.sql';

export const apiKeys = pgTable(
  'api_keys',
  {
    id: text('id').primaryKey(),
    userDid: text('user_did')
      .notNull()
      .references(() => users.id),
    name: text('name').notNull(),
    prefix: text('prefix').notNull(),
    tokenHash: text('token_hash').notNull().unique(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    lastUsedAt: timestamp('last_used_at'),
    expiresAt: timestamp('expires_at'),
    revoked: boolean('revoked').notNull().default(false),
  },
  (table) => ({
    userDidIdx: index('api_keys_user_did_idx').on(table.userDid),
    tokenHashIdx: index('api_keys_token_hash_idx').on(table.tokenHash),
  }),
);
