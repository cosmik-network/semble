import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import postgres from 'postgres';
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { randomUUID } from 'crypto';
import { DrizzleCardQueryRepository } from '../../infrastructure/repositories/DrizzleCardQueryRepository';
import { cards } from '../../infrastructure/repositories/schema/card.sql';
import {
  collections,
  collectionCards,
} from '../../infrastructure/repositories/schema/collection.sql';
import { libraryMemberships } from '../../infrastructure/repositories/schema/libraryMembership.sql';
import { connections } from '../../infrastructure/repositories/schema/connection.sql';
import { createTestSchema } from '../test-utils/createTestSchema';
import { CardTypeEnum } from '../../domain/value-objects/CardType';
import { ConnectionTypeEnum } from '../../domain/value-objects/ConnectionType';

describe('DrizzleCardQueryRepository - getBatchUrlStats', () => {
  let container: StartedPostgreSqlContainer;
  let db: PostgresJsDatabase;
  let queryRepository: DrizzleCardQueryRepository;

  const alice = 'did:plc:alice';
  const bob = 'did:plc:bob';
  const urlA = 'https://example.com/a';
  const urlB = 'https://example.com/b';
  const urlC = 'https://example.com/c';

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:14').start();
    const connectionString = container.getConnectionUri();
    process.env.DATABASE_URL = connectionString;
    const client = postgres(connectionString);
    db = drizzle(client);
    queryRepository = new DrizzleCardQueryRepository(db);
    await createTestSchema(db);
  }, 60000);

  afterAll(async () => {
    await container.stop();
  });

  beforeEach(async () => {
    await db.delete(connections);
    await db.delete(collectionCards);
    await db.delete(collections);
    await db.delete(libraryMemberships);
    await db.delete(cards);
  });

  async function insertUrlCard(authorId: string, url: string) {
    const id = randomUUID();
    await db.insert(cards).values({
      id,
      authorId,
      type: CardTypeEnum.URL,
      contentData: { url },
      url,
    });
    await db
      .insert(libraryMemberships)
      .values({ cardId: id, userId: authorId });
    return id;
  }

  async function insertNoteCard(
    authorId: string,
    url: string,
    parentId: string,
  ) {
    await db.insert(cards).values({
      id: randomUUID(),
      authorId,
      type: CardTypeEnum.NOTE,
      contentData: { text: 'note' },
      url,
      parentCardId: parentId,
    });
  }

  async function insertCollectionWith(cardIds: string[]) {
    const id = randomUUID();
    await db.insert(collections).values({
      id,
      authorId: alice,
      name: 'c',
      accessType: 'OPEN',
    });
    for (const cardId of cardIds) {
      await db
        .insert(collectionCards)
        .values({ id: randomUUID(), collectionId: id, cardId, addedBy: alice });
    }
  }

  async function insertConnection(
    curatorId: string,
    source: { type: string; value: string },
    target: { type: string; value: string },
    connectionType?: ConnectionTypeEnum,
  ) {
    await db.insert(connections).values({
      id: randomUUID(),
      curatorId,
      sourceType: source.type,
      sourceValue: source.value,
      targetType: target.type,
      targetValue: target.value,
      connectionType: connectionType ?? null,
    });
  }

  it('returns zeroed stats for every requested URL with no data', async () => {
    const result = await queryRepository.getBatchUrlStats([urlA, urlB]);

    expect(result.size).toBe(2);
    expect(result.get(urlA)).toEqual({
      libraryCount: 0,
      noteCount: 0,
      collectionCount: 0,
      connections: {
        forwardTotal: 0,
        backwardTotal: 0,
        forwardByType: new Map(),
        backwardByType: new Map(),
      },
      urlInLibrary: undefined,
      urlIsConnected: undefined,
    });
  });

  it('returns an empty map for no URLs', async () => {
    const result = await queryRepository.getBatchUrlStats([]);
    expect(result.size).toBe(0);
  });

  it('counts library, notes and collections per URL', async () => {
    const aliceA = await insertUrlCard(alice, urlA);
    const bobA = await insertUrlCard(bob, urlA);
    const aliceB = await insertUrlCard(alice, urlB);
    await insertNoteCard(alice, urlA, aliceA);
    await insertNoteCard(bob, urlA, bobA);
    // Two collections contain urlA cards (one contains both); one contains urlB
    await insertCollectionWith([aliceA, bobA]);
    await insertCollectionWith([bobA, aliceB]);

    const result = await queryRepository.getBatchUrlStats([urlA, urlB]);

    expect(result.get(urlA)).toMatchObject({
      libraryCount: 2,
      noteCount: 2,
      collectionCount: 2,
    });
    expect(result.get(urlB)).toMatchObject({
      libraryCount: 1,
      noteCount: 0,
      collectionCount: 1,
    });
  });

  it('counts URL↔URL connections by direction and type, ignoring CARD counterparts', async () => {
    const url = (value: string) => ({ type: 'URL', value });
    await insertConnection(
      alice,
      url(urlA),
      url(urlB),
      ConnectionTypeEnum.SUPPORTS,
    );
    await insertConnection(
      bob,
      url(urlA),
      url(urlC),
      ConnectionTypeEnum.SUPPORTS,
    );
    await insertConnection(
      bob,
      url(urlC),
      url(urlA),
      ConnectionTypeEnum.OPPOSES,
    );
    // Untyped: counts toward totals only
    await insertConnection(bob, url(urlB), url(urlA));
    // URL→CARD: excluded
    await insertConnection(bob, url(urlA), {
      type: 'CARD',
      value: randomUUID(),
    });

    const result = await queryRepository.getBatchUrlStats([urlA, urlB]);

    const a = result.get(urlA)!.connections;
    expect(a.forwardTotal).toBe(2);
    expect(a.backwardTotal).toBe(2);
    expect(a.forwardByType).toEqual(
      new Map([[ConnectionTypeEnum.SUPPORTS, 2]]),
    );
    expect(a.backwardByType).toEqual(
      new Map([[ConnectionTypeEnum.OPPOSES, 1]]),
    );

    // urlA→urlB counted as backward for urlB in the same query as urlA's forward
    const b = result.get(urlB)!.connections;
    expect(b.forwardTotal).toBe(1);
    expect(b.backwardTotal).toBe(1);
    expect(b.backwardByType).toEqual(
      new Map([[ConnectionTypeEnum.SUPPORTS, 1]]),
    );
  });

  it('sets caller flags only when a calling user is given', async () => {
    await insertUrlCard(alice, urlA);
    await insertConnection(
      alice,
      { type: 'URL', value: urlC },
      { type: 'URL', value: urlB },
    );
    // Alice's URL→CARD connection does not mark urlA as connected
    await insertConnection(
      alice,
      { type: 'URL', value: urlA },
      { type: 'CARD', value: randomUUID() },
    );

    const result = await queryRepository.getBatchUrlStats(
      [urlA, urlB, urlC],
      alice,
    );

    expect(result.get(urlA)).toMatchObject({
      urlInLibrary: true,
      urlIsConnected: false,
    });
    expect(result.get(urlB)).toMatchObject({
      urlInLibrary: false,
      urlIsConnected: true,
    });
    expect(result.get(urlC)).toMatchObject({
      urlInLibrary: false,
      urlIsConnected: true,
    });
  });
});
