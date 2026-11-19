import {
  pgTable,
  text,
  timestamp,
  integer,
  uuid,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { cards } from './card.sql';

/**
 * Canonical storage for annotation card selectors — one row per selector,
 * in ordinal order. The cards.content_data JSONB for ANNOTATION cards holds
 * only the note; selectors live here so they can be searched and indexed.
 *
 * exact_normalized is computed by normalizeQuotedText (domain) at write time
 * and is the comparison key for "same passage" matching — raw exact is never
 * compared directly and nothing but matching reads the normalized column.
 */
export const annotationSelectors = pgTable(
  'annotation_selectors',
  {
    id: uuid('id').primaryKey(),
    cardId: uuid('card_id')
      .notNull()
      .references(() => cards.id, { onDelete: 'cascade' }),
    selectorType: text('selector_type').notNull(), // 'TextQuoteSelector'
    ordinal: integer('ordinal').notNull(),
    exact: text('exact').notNull(),
    exactNormalized: text('exact_normalized').notNull(),
    prefix: text('prefix'),
    suffix: text('suffix'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => {
    return {
      // Preserves selector order and serves card_id lookups. Per-URL passage
      // matching prunes via idx_cards_url_type first, so no exact_normalized
      // index until cross-URL search is real.
      cardOrdinalUniq: uniqueIndex('annotation_selectors_card_ordinal_uniq').on(
        table.cardId,
        table.ordinal,
      ),
    };
  },
);
