import {
  pgTable,
  text,
  timestamp,
  jsonb,
  uuid,
  integer,
  boolean,
  index,
} from 'drizzle-orm/pg-core';

// One row per canvas board. The tldraw document and its thumbnail live in
// object storage; this row is the indexable metadata plus the current
// document's storage key and revision.
export const canvases = pgTable(
  'canvases',
  {
    id: uuid('id').primaryKey(),
    ownerDid: text('owner_did').notNull(),
    name: text('name').notNull(),
    tldrawVersion: text('tldraw_version').notNull(),
    linkCount: integer('link_count').notNull().default(0),
    // Bumped on every document save; clients send it back so concurrent
    // writers can be detected
    revision: integer('revision').notNull().default(0),
    // tldraw schema sequences of the saved document, for the client-side
    // newer-version gate. Empty until the first save.
    schemaSequences: jsonb('schema_sequences')
      .$type<Record<string, number>>()
      .notNull()
      .default({}),
    // Object storage key of the document this revision points at; null when
    // the board has never been saved
    documentKey: text('document_key'),
    // Set once a thumbnail has been uploaded. Thumbnails live at a fixed key
    // and are overwritten in place, so presence is all the row needs.
    hasThumbnail: boolean('has_thumbnail').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => {
    return {
      ownerIdx: index('canvases_owner_idx').on(table.ownerDid),
      ownerUpdatedIdx: index('canvases_owner_updated_idx').on(
        table.ownerDid,
        table.updatedAt.desc(),
      ),
    };
  },
);
