import {
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  integer,
  index,
} from 'drizzle-orm/pg-core';
import { publishedRecords } from './publishedRecord.sql';
import { cards } from './card.sql';

export const collections = pgTable(
  'collections',
  {
    id: uuid('id').primaryKey(),
    authorId: text('author_id').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    accessType: text('access_type').notNull(), // OPEN, CLOSED
    cardCount: integer('card_count').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    publishedRecordId: uuid('published_record_id').references(
      () => publishedRecords.id,
    ),
  },
  (table) => {
    return {
      // Critical for all collection queries by user
      authorIdIdx: index('collections_author_id_idx').on(table.authorId),

      // For paginated collection listings (most common sort)
      authorUpdatedAtIdx: index('collections_author_updated_at_idx').on(
        table.authorId,
        table.updatedAt,
      ),
    };
  },
);

// Join table for collection collaborators
export const collectionCollaborators = pgTable('collection_collaborators', {
  id: uuid('id').primaryKey(),
  collectionId: uuid('collection_id')
    .notNull()
    .references(() => collections.id, { onDelete: 'cascade' }),
  collaboratorId: text('collaborator_id').notNull(),
});

// Join table for cards in collections
export const collectionCards = pgTable(
  'collection_cards',
  {
    id: uuid('id').primaryKey(),
    collectionId: uuid('collection_id')
      .notNull()
      .references(() => collections.id, { onDelete: 'cascade' }),
    cardId: uuid('card_id')
      .notNull()
      .references(() => cards.id, { onDelete: 'cascade' }),
    addedBy: text('added_by').notNull(),
    addedAt: timestamp('added_at').notNull().defaultNow(),
    viaCardId: uuid('via_card_id').references(() => cards.id),
    publishedRecordId: uuid('published_record_id').references(
      () => publishedRecords.id,
    ),
  },
  (table) => {
    return {
      // Critical for getCollectionsContainingCardForUser queries
      cardIdIdx: index('collection_cards_card_id_idx').on(table.cardId),
      collectionIdIdx: index('collection_cards_collection_id_idx').on(
        table.collectionId,
      ),
      // Performance indexes
      // Index for getCardsInCollection - sorted by add time
      collectionAddedIdx: index('idx_collection_cards_collection_added').on(
        table.collectionId,
        table.addedAt.desc(),
      ),
      // Index for finding collections containing a card
      cardCollectionIdx: index('idx_collection_cards_card_collection').on(
        table.cardId,
      ),
    };
  },
);
