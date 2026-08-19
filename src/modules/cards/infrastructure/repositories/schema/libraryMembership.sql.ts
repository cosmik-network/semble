import {
  pgTable,
  text,
  timestamp,
  primaryKey,
  index,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { cards } from './card.sql';
import { publishedRecords } from 'src/modules/cards/infrastructure/repositories/schema/publishedRecord.sql';

export const libraryMemberships = pgTable(
  'library_memberships',
  {
    cardId: uuid('card_id')
      .notNull()
      .references(() => cards.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),
    addedAt: timestamp('added_at').notNull().defaultNow(),
    publishedRecordId: uuid('published_record_id').references(
      () => publishedRecords.id,
    ),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.cardId, table.userId] }),
      userCardsIdx: index('idx_user_cards').on(table.userId),
      cardUsersIdx: index('idx_card_users').on(table.cardId),
      // Performance indexes
      // Index for getUrlCardsOfUser
      userTypeCoveringIdx: index(
        'idx_library_memberships_user_type_covering',
      ).on(table.userId, table.addedAt.desc()),
      // Index for AT-URI resolution joins from published_records
      publishedRecordIdIdx: index('idx_library_memberships_published_record_id')
        .on(table.publishedRecordId)
        .where(sql`published_record_id IS NOT NULL`),
    };
  },
);
