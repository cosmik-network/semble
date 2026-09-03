import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import postgres from 'postgres';
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { randomUUID } from 'crypto';
import { DrizzleTagQueryRepository } from '../../infrastructure/repositories/DrizzleTagQueryRepository';
import { DrizzleCardRepository } from '../../infrastructure/repositories/DrizzleCardRepository';
import { CuratorId } from '../../domain/value-objects/CuratorId';
import { cards } from '../../infrastructure/repositories/schema/card.sql';
import {
  collections,
  collectionCards,
} from '../../infrastructure/repositories/schema/collection.sql';
import { connections } from '../../infrastructure/repositories/schema/connection.sql';
import { libraryMemberships } from '../../infrastructure/repositories/schema/libraryMembership.sql';
import { publishedRecords } from '../../infrastructure/repositories/schema/publishedRecord.sql';
import { CardBuilder } from '../utils/builders/CardBuilder';
import { URL } from '../../domain/value-objects/URL';
import { createTestSchema } from '../test-utils/createTestSchema';
import { Card } from '../../domain/Card';

describe('DrizzleTagQueryRepository', () => {
  let container: StartedPostgreSqlContainer;
  let db: PostgresJsDatabase;
  let repo: DrizzleTagQueryRepository;
  let cardRepository: DrizzleCardRepository;

  const curator1 = 'did:plc:tagcurator1';
  const curator2 = 'did:plc:tagcurator2';

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:14').start();
    const client = postgres(container.getConnectionUri());
    db = drizzle(client);
    repo = new DrizzleTagQueryRepository(db);
    cardRepository = new DrizzleCardRepository(db);
    await createTestSchema(db);
  }, 60000);

  afterAll(async () => {
    await container.stop();
  });

  beforeEach(async () => {
    await db.delete(collectionCards);
    await db.delete(connections);
    await db.delete(collections);
    await db.delete(libraryMemberships);
    await db.delete(cards);
    await db.delete(publishedRecords);
  });

  async function createNoteOnUrlCard(
    curatorDid: string,
    urlString: string,
    noteText: string,
    createdAt: Date,
  ): Promise<{ parentCard: Card; noteCard: Card }> {
    const url = URL.create(urlString).unwrap();
    const parentCard = new CardBuilder()
      .withCuratorId(curatorDid)
      .withUrlCard(url)
      .withCreatedAt(createdAt)
      .withUpdatedAt(createdAt)
      .buildOrThrow();
    await cardRepository.save(parentCard);

    const noteCard = new CardBuilder()
      .withCuratorId(curatorDid)
      .withNoteCard(noteText)
      .withUrl(url)
      .withParentCard(parentCard.cardId)
      .withCreatedAt(createdAt)
      .withUpdatedAt(createdAt)
      .buildOrThrow();
    await cardRepository.save(noteCard);

    return { parentCard, noteCard };
  }

  async function insertConnection(
    curatorDid: string,
    note: string | null,
    createdAt: Date,
  ): Promise<string> {
    const id = randomUUID();
    await db.insert(connections).values({
      id,
      curatorId: curatorDid,
      sourceType: 'URL',
      sourceValue: 'https://source.example.com',
      targetType: 'URL',
      targetValue: 'https://target.example.com',
      note,
      createdAt,
      updatedAt: createdAt,
    });
    return id;
  }

  async function insertCollection(
    authorDid: string,
    description: string | null,
    createdAt: Date,
  ): Promise<string> {
    const id = randomUUID();
    await db.insert(collections).values({
      id,
      authorId: authorDid,
      name: `Collection ${id.slice(0, 8)}`,
      description,
      accessType: 'CLOSED',
      createdAt,
      updatedAt: createdAt,
    });
    return id;
  }

  describe('getTaggedCards', () => {
    it('returns the parent URL card of a note containing the tag', async () => {
      const { parentCard } = await createNoteOnUrlCard(
        curator1,
        'https://example.com/a',
        'great read on #history',
        new Date('2023-01-01'),
      );

      const result = await repo.getTaggedCards('history', {
        page: 1,
        limit: 10,
      });

      expect(result.totalCount).toBe(1);
      expect(result.items[0]!.parentCardId).toBe(
        parentCard.cardId.getStringValue(),
      );
    });

    it('does not match a longer tag with the same prefix', async () => {
      await createNoteOnUrlCard(
        curator1,
        'https://example.com/a',
        'about #historyfoo only',
        new Date('2023-01-01'),
      );

      const result = await repo.getTaggedCards('history', {
        page: 1,
        limit: 10,
      });

      expect(result.totalCount).toBe(0);
    });

    it('matches case-insensitively', async () => {
      await createNoteOnUrlCard(
        curator1,
        'https://example.com/a',
        'see #History for more',
        new Date('2023-01-01'),
      );

      const result = await repo.getTaggedCards('history', {
        page: 1,
        limit: 10,
      });

      expect(result.totalCount).toBe(1);
    });

    it('filters by userDid and sorts newest note first', async () => {
      const { parentCard: c1new } = await createNoteOnUrlCard(
        curator1,
        'https://example.com/new',
        '#maps newest',
        new Date('2023-02-01'),
      );
      const { parentCard: c1old } = await createNoteOnUrlCard(
        curator1,
        'https://example.com/old',
        '#maps oldest',
        new Date('2023-01-01'),
      );
      await createNoteOnUrlCard(
        curator2,
        'https://example.com/other',
        '#maps other user',
        new Date('2023-03-01'),
      );

      const all = await repo.getTaggedCards('maps', { page: 1, limit: 10 });
      expect(all.totalCount).toBe(3);

      const filtered = await repo.getTaggedCards('maps', {
        page: 1,
        limit: 10,
        userDid: curator1,
      });
      expect(filtered.totalCount).toBe(2);
      expect(filtered.items.map((i) => i.parentCardId)).toEqual([
        c1new.cardId.getStringValue(),
        c1old.cardId.getStringValue(),
      ]);
    });
  });

  describe('getTaggedConnections', () => {
    it('returns connections whose note contains the tag, newest first', async () => {
      const newer = await insertConnection(
        curator1,
        'linked because #history',
        new Date('2023-02-01'),
      );
      const older = await insertConnection(
        curator2,
        '#history too',
        new Date('2023-01-01'),
      );
      await insertConnection(curator1, 'no tags here', new Date('2023-03-01'));
      await insertConnection(curator1, null, new Date('2023-03-02'));

      const result = await repo.getTaggedConnections('history', {
        page: 1,
        limit: 10,
      });

      expect(result.totalCount).toBe(2);
      expect(result.items.map((i) => i.connection.id)).toEqual([newer, older]);
      expect(result.items[0]!.connection.note).toBe('linked because #history');
    });
  });

  describe('getTaggedCollections', () => {
    it('returns collections whose description contains the tag', async () => {
      const tagged = await insertCollection(
        curator1,
        'all about #history and more',
        new Date('2023-01-01'),
      );
      await insertCollection(curator1, 'nothing here', new Date('2023-01-02'));
      await insertCollection(curator1, null, new Date('2023-01-03'));

      const result = await repo.getTaggedCollections('history', {
        page: 1,
        limit: 10,
      });

      expect(result.totalCount).toBe(1);
      expect(result.items[0]!.id).toBe(tagged);
    });
  });

  describe('getRecentTexts', () => {
    it('returns texts from notes, connection notes, and collection descriptions for a user', async () => {
      await createNoteOnUrlCard(
        curator1,
        'https://example.com/a',
        'note with #alpha',
        new Date('2023-01-01'),
      );
      await insertConnection(
        curator1,
        'conn with #beta',
        new Date('2023-01-02'),
      );
      await insertCollection(
        curator1,
        'desc with #gamma',
        new Date('2023-01-03'),
      );
      await insertConnection(
        curator2,
        'other user #delta',
        new Date('2023-01-04'),
      );

      const texts = await repo.getRecentTexts({
        userDid: curator1,
        limitPerSource: 50,
      });

      const joined = texts.map((t) => t.text).join(' ');
      expect(joined).toContain('#alpha');
      expect(joined).toContain('#beta');
      expect(joined).toContain('#gamma');
      expect(joined).not.toContain('#delta');
    });

    it('returns a global window when no user is given', async () => {
      await insertConnection(curator2, 'global #delta', new Date('2023-01-04'));

      const texts = await repo.getRecentTexts({ limitPerSource: 50 });

      expect(texts.map((t) => t.text).join(' ')).toContain('#delta');
    });
  });
});
