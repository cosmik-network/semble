import { sql } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

export async function createTestSchema(db: PostgresJsDatabase) {
  // Create extension
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

  // Create tables in dependency order using raw SQL with proper column names
  const tableCreationQueries = [
    // Published records table (no dependencies)
    sql`CREATE TABLE IF NOT EXISTS published_records (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      uri TEXT NOT NULL,
      cid TEXT NOT NULL,
      recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      UNIQUE(uri, cid)
    )`,

    // Cards table (references published_records and self-references)
    sql`CREATE TABLE IF NOT EXISTS cards (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      author_id TEXT NOT NULL,
      type TEXT NOT NULL,
      content_data JSONB NOT NULL,
      url TEXT,
      parent_card_id UUID REFERENCES cards(id),
      via_card_id UUID REFERENCES cards(id),
      published_record_id UUID REFERENCES published_records(id),
      library_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    )`,

    // Library memberships table (references cards and published_records)
    sql`CREATE TABLE IF NOT EXISTS library_memberships (
      card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL,
      added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      published_record_id UUID REFERENCES published_records(id),
      PRIMARY KEY (card_id, user_id)
    )`,

    // Collections table (references published_records)
    sql`CREATE TABLE IF NOT EXISTS collections (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      author_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      access_type TEXT NOT NULL,
      card_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      published_record_id UUID REFERENCES published_records(id)
    )`,

    // Collection collaborators table (references collections)
    sql`CREATE TABLE IF NOT EXISTS collection_collaborators (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
      collaborator_id TEXT NOT NULL,
      UNIQUE(collection_id, collaborator_id)
    )`,

    // Collection cards table (references collections, cards, and published_records)
    sql`CREATE TABLE IF NOT EXISTS collection_cards (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
      card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
      added_by TEXT NOT NULL,
      added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      via_card_id UUID REFERENCES cards(id),
      published_record_id UUID REFERENCES published_records(id),
      UNIQUE(collection_id, card_id)
    )`,
    sql`
    CREATE TABLE IF NOT EXISTS feed_activities (
      id UUID PRIMARY KEY,
      actor_id TEXT NOT NULL,
      type TEXT NOT NULL,
      metadata JSONB NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
  ];

  // Execute table creation queries in order
  for (const query of tableCreationQueries) {
    await db.execute(query);
  }

  // Create indexes
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS idx_user_cards ON library_memberships(user_id)`,
  );
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS idx_card_users ON library_memberships(card_id)`,
  );

  // Performance indexes
  // Covering index for getUrlCardsOfUser - avoids table lookups by including cardId
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_library_memberships_user_type_covering 
    ON library_memberships(user_id, added_at DESC) 
    INCLUDE (card_id)
  `);

  // Optimizes sorting cards by type and update time in query results
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_cards_type_updated_at 
    ON cards(type, updated_at DESC)
  `);

  // Index for getLibrariesForUrl and getCollectionsWithUrl - fast URL+type lookups with card ID included
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_cards_url_type 
    ON cards(url, type) INCLUDE (id)
  `);

  // Covering index for getCardsInCollection - sorted by add time with cardId included
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_collection_cards_collection_added 
    ON collection_cards(collection_id, added_at DESC) 
    INCLUDE (card_id)
  `);

  // Partial index for finding NOTE cards by parent - only indexes NOTE type cards
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_cards_parent_type 
    ON cards(parent_card_id, type) WHERE type = 'NOTE'
  `);

  // Covering index for finding collections containing a card - avoids table lookups
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_collection_cards_card_collection 
    ON collection_cards(card_id) INCLUDE (collection_id)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_feed_activities_created_at ON feed_activities(created_at DESC);
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_feed_activities_actor_id ON feed_activities(actor_id);
  `);

  // Index for efficient AT URI look ups
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS published_records_uri_idx ON published_records(uri);
  `);

  // Cards table indexes
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS cards_author_url_idx ON cards(author_id, url);
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS cards_author_id_idx ON cards(author_id);
  `);

  // Collections table indexes
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS collections_author_id_idx ON collections(author_id);
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS collections_author_updated_at_idx ON collections(author_id, updated_at);
  `);

  // Collection cards table indexes
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS collection_cards_card_id_idx ON collection_cards(card_id);
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS collection_cards_collection_id_idx ON collection_cards(collection_id);
  `);
}
