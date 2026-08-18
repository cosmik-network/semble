import {
  pgTable,
  text,
  timestamp,
  boolean,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { users } from './user.sql';

export const authRefreshTokens = pgTable(
  'auth_refresh_tokens',
  {
    tokenId: text('token_id').primaryKey(),
    userDid: text('user_did')
      .notNull()
      .references(() => users.id),
    refreshToken: text('refresh_token').notNull(),
    issuedAt: timestamp('issued_at').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    revoked: boolean('revoked').default(false),
  },
  (table) => {
    return {
      // Token refresh looks up by refresh_token on every rotation
      refreshTokenIdx: uniqueIndex('auth_refresh_tokens_refresh_token_idx').on(
        table.refreshToken,
      ),
    };
  },
);
