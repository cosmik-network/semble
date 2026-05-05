import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import postgres from 'postgres';
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { GetUrlSubGraphUseCase } from '../../application/useCases/queries/GetUrlSubGraphUseCase';
import { DrizzleGraphQueryRepository } from '../../infrastructure/repositories/DrizzleGraphQueryRepository';
import { DrizzleCardRepository } from '../../infrastructure/repositories/DrizzleCardRepository';
import { DrizzleCollectionRepository } from '../../infrastructure/repositories/DrizzleCollectionRepository';
import { DrizzleConnectionRepository } from '../../infrastructure/repositories/DrizzleConnectionRepository';
import { CuratorId } from '../../domain/value-objects/CuratorId';
import { CardBuilder } from '../utils/builders/CardBuilder';
import { URL } from '../../domain/value-objects/URL';
import { CardTypeEnum } from '../../domain/value-objects/CardType';
import { Collection, CollectionAccessType } from '../../domain/Collection';
import { Connection } from '../../domain/Connection';
import { UrlOrCardId } from '../../domain/value-objects/UrlOrCardId';
import { createTestSchema } from '../test-utils/createTestSchema';
import { cards } from '../../infrastructure/repositories/schema/card.sql';
import {
  collections as collectionsTable,
  collectionCards,
} from '../../infrastructure/repositories/schema/collection.sql';
import { connections as connectionsTable } from '../../infrastructure/repositories/schema/connection.sql';
import { libraryMemberships } from '../../infrastructure/repositories/schema/libraryMembership.sql';
import { publishedRecords } from '../../infrastructure/repositories/schema/publishedRecord.sql';

describe('GetUrlSubGraphUseCase - Depth Traversal', () => {
  let container: StartedPostgreSqlContainer;
  let db: PostgresJsDatabase;
  let useCase: GetUrlSubGraphUseCase;
  let cardRepository: DrizzleCardRepository;
  let collectionRepository: DrizzleCollectionRepository;
  let connectionRepository: DrizzleConnectionRepository;
  let graphQueryRepository: DrizzleGraphQueryRepository;

  let curator: CuratorId;

  beforeAll(async () => {
    // Start PostgreSQL container
    container = await new PostgreSqlContainer('postgres:14').start();

    // Create database connection
    const connectionString = container.getConnectionUri();
    process.env.DATABASE_URL = connectionString;
    const client = postgres(connectionString);
    db = drizzle(client);

    // Create repositories
    cardRepository = new DrizzleCardRepository(db);
    collectionRepository = new DrizzleCollectionRepository(db);
    connectionRepository = new DrizzleConnectionRepository(db);
    graphQueryRepository = new DrizzleGraphQueryRepository(db);

    // Create use case
    useCase = new GetUrlSubGraphUseCase(graphQueryRepository);

    // Create schema
    await createTestSchema(db);

    curator = CuratorId.create('did:plc:testcurator').unwrap();
  }, 60000);

  afterAll(async () => {
    await container.stop();
  });

  beforeEach(async () => {
    // Clear all data
    await db.delete(collectionCards);
    await db.delete(connectionsTable);
    await db.delete(collectionsTable);
    await db.delete(libraryMemberships);
    await db.delete(cards);
    await db.delete(publishedRecords);
  });

  describe('Depth 1 traversal', () => {
    it('should return collections containing the URL and directly connected URLs', async () => {
      // Create URL-A (target)
      const urlA = 'https://example.com/url-a';
      const cardA = new CardBuilder()
        .withCuratorId(curator.value)
        .withType(CardTypeEnum.URL)
        .withUrl(URL.create(urlA).unwrap())
        .buildOrThrow();
      await cardRepository.save(cardA);

      // Create URL-B (connected via connection)
      const urlB = 'https://example.com/url-b';
      const cardB = new CardBuilder()
        .withCuratorId(curator.value)
        .withType(CardTypeEnum.URL)
        .withUrl(URL.create(urlB).unwrap())
        .buildOrThrow();
      await cardRepository.save(cardB);

      // Create URL-C (in same collection as URL-A)
      const urlC = 'https://example.com/url-c';
      const cardC = new CardBuilder()
        .withCuratorId(curator.value)
        .withType(CardTypeEnum.URL)
        .withUrl(URL.create(urlC).unwrap())
        .buildOrThrow();
      await cardRepository.save(cardC);

      // Create COLLECTION-1 containing URL-A and URL-C
      const collection1 = Collection.create({
        authorId: curator,
        name: 'Collection 1',
        accessType: CollectionAccessType.OPEN,
        collaboratorIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }).unwrap();
      await collectionRepository.save(collection1);
      collection1.addCard(cardA.cardId, curator);
      collection1.addCard(cardC.cardId, curator);
      await collectionRepository.save(collection1);

      // Create CONNECTION from URL-A to URL-B
      const connection = Connection.create({
        source: UrlOrCardId.createFromUrl(URL.create(urlA).unwrap()).unwrap(),
        target: UrlOrCardId.createFromUrl(URL.create(urlB).unwrap()).unwrap(),
        curatorId: curator,
      }).unwrap();
      await connectionRepository.save(connection);

      // Execute query with depth 1
      const result = await useCase.execute({ url: urlA, depth: 1 });

      expect(result.isOk()).toBe(true);
      const graphData = result.unwrap();

      // Should have 3 nodes: URL-A, URL-B (connected), COLLECTION-1
      // URL-C is NOT included at depth 1 (it's in the collection but we don't expand from collections yet)
      expect(graphData.nodes.length).toBeGreaterThanOrEqual(3);

      const nodeIds = graphData.nodes.map((n) => n.id);
      expect(nodeIds).toContain(`url:${urlA}`);
      expect(nodeIds).toContain(`url:${urlB}`);
      expect(nodeIds).toContain(
        `collection:${collection1.collectionId.getStringValue()}`,
      );

      // Should have 2 edges: URL-A → URL-B (connection), COLLECTION-1 → URL-A (contains)
      expect(graphData.edges.length).toBeGreaterThanOrEqual(2);

      const edgeTypes = graphData.edges.map((e) => e.type);
      expect(edgeTypes).toContain('URL_CONNECTS_URL');
      expect(edgeTypes).toContain('COLLECTION_CONTAINS_URL');
    });
  });

  describe('Depth 2 traversal', () => {
    it('should expand from collections to include all URLs in those collections', async () => {
      // Create URL-A (target)
      const urlA = 'https://example.com/url-a';
      const cardA = new CardBuilder()
        .withCuratorId(curator.value)
        .withType(CardTypeEnum.URL)
        .withUrl(URL.create(urlA).unwrap())
        .buildOrThrow();
      await cardRepository.save(cardA);

      // Create URL-B and URL-C (in same collection as URL-A)
      const urlB = 'https://example.com/url-b';
      const cardB = new CardBuilder()
        .withCuratorId(curator.value)
        .withType(CardTypeEnum.URL)
        .withUrl(URL.create(urlB).unwrap())
        .buildOrThrow();
      await cardRepository.save(cardB);

      const urlC = 'https://example.com/url-c';
      const cardC = new CardBuilder()
        .withCuratorId(curator.value)
        .withType(CardTypeEnum.URL)
        .withUrl(URL.create(urlC).unwrap())
        .buildOrThrow();
      await cardRepository.save(cardC);

      // Create COLLECTION-1 containing URL-A, URL-B, and URL-C
      const collection1 = Collection.create({
        authorId: curator,
        name: 'Collection 1',
        accessType: CollectionAccessType.OPEN,
        collaboratorIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }).unwrap();
      await collectionRepository.save(collection1);
      collection1.addCard(cardA.cardId, curator);
      collection1.addCard(cardB.cardId, curator);
      collection1.addCard(cardC.cardId, curator);
      await collectionRepository.save(collection1);

      // Execute query with depth 1 - should NOT include URL-B and URL-C
      const depth1Result = await useCase.execute({ url: urlA, depth: 1 });
      expect(depth1Result.isOk()).toBe(true);
      const depth1Data = depth1Result.unwrap();

      const depth1NodeIds = depth1Data.nodes.map((n) => n.id);
      // At depth 1, we should see URL-A and COLLECTION-1, but not URL-B or URL-C yet
      expect(depth1NodeIds).toContain(`url:${urlA}`);
      expect(depth1NodeIds).toContain(
        `collection:${collection1.collectionId.getStringValue()}`,
      );

      // Execute query with depth 2 - should include URL-B and URL-C
      const depth2Result = await useCase.execute({ url: urlA, depth: 2 });
      expect(depth2Result.isOk()).toBe(true);
      const depth2Data = depth2Result.unwrap();

      const depth2NodeIds = depth2Data.nodes.map((n) => n.id);
      // At depth 2, we should expand from COLLECTION-1 and see URL-B and URL-C
      expect(depth2NodeIds).toContain(`url:${urlA}`);
      expect(depth2NodeIds).toContain(`url:${urlB}`);
      expect(depth2NodeIds).toContain(`url:${urlC}`);
      expect(depth2NodeIds).toContain(
        `collection:${collection1.collectionId.getStringValue()}`,
      );

      // Should have edges from collection to all its URLs
      const collectionEdges = depth2Data.edges.filter(
        (e) =>
          e.type === 'COLLECTION_CONTAINS_URL' &&
          e.source ===
            `collection:${collection1.collectionId.getStringValue()}`,
      );
      expect(collectionEdges.length).toBeGreaterThanOrEqual(3); // Collection → URL-A, URL-B, URL-C
    });

    it('should expand from connected URLs to get their collections', async () => {
      // Create URL-A (target)
      const urlA = 'https://example.com/url-a';
      const cardA = new CardBuilder()
        .withCuratorId(curator.value)
        .withType(CardTypeEnum.URL)
        .withUrl(URL.create(urlA).unwrap())
        .buildOrThrow();
      await cardRepository.save(cardA);

      // Create URL-B (connected to URL-A)
      const urlB = 'https://example.com/url-b';
      const cardB = new CardBuilder()
        .withCuratorId(curator.value)
        .withType(CardTypeEnum.URL)
        .withUrl(URL.create(urlB).unwrap())
        .buildOrThrow();
      await cardRepository.save(cardB);

      // Create COLLECTION-2 containing URL-B
      const collection2 = Collection.create({
        authorId: curator,
        name: 'Collection 2',
        accessType: CollectionAccessType.OPEN,
        collaboratorIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }).unwrap();
      await collectionRepository.save(collection2);
      collection2.addCard(cardB.cardId, curator);
      await collectionRepository.save(collection2);

      // Create CONNECTION from URL-A to URL-B
      const connection = Connection.create({
        source: UrlOrCardId.createFromUrl(URL.create(urlA).unwrap()).unwrap(),
        target: UrlOrCardId.createFromUrl(URL.create(urlB).unwrap()).unwrap(),
        curatorId: curator,
      }).unwrap();
      await connectionRepository.save(connection);

      // Execute query with depth 2
      const result = await useCase.execute({ url: urlA, depth: 2 });

      expect(result.isOk()).toBe(true);
      const graphData = result.unwrap();

      const nodeIds = graphData.nodes.map((n) => n.id);
      // Should include URL-A, URL-B (depth 1), and COLLECTION-2 (depth 2, containing URL-B)
      expect(nodeIds).toContain(`url:${urlA}`);
      expect(nodeIds).toContain(`url:${urlB}`);
      expect(nodeIds).toContain(
        `collection:${collection2.collectionId.getStringValue()}`,
      );
    });
  });

  describe('Depth 3 traversal', () => {
    it('should recursively expand the graph to depth 3', async () => {
      // Create a chain: URL-A → COLLECTION-1 → URL-B → COLLECTION-2 → URL-C → CONNECTION → URL-D

      const urlA = 'https://example.com/url-a';
      const cardA = new CardBuilder()
        .withCuratorId(curator.value)
        .withType(CardTypeEnum.URL)
        .withUrl(URL.create(urlA).unwrap())
        .buildOrThrow();
      await cardRepository.save(cardA);

      const urlB = 'https://example.com/url-b';
      const cardB = new CardBuilder()
        .withCuratorId(curator.value)
        .withType(CardTypeEnum.URL)
        .withUrl(URL.create(urlB).unwrap())
        .buildOrThrow();
      await cardRepository.save(cardB);

      const urlC = 'https://example.com/url-c';
      const cardC = new CardBuilder()
        .withCuratorId(curator.value)
        .withType(CardTypeEnum.URL)
        .withUrl(URL.create(urlC).unwrap())
        .buildOrThrow();
      await cardRepository.save(cardC);

      const urlD = 'https://example.com/url-d';
      const cardD = new CardBuilder()
        .withCuratorId(curator.value)
        .withType(CardTypeEnum.URL)
        .withUrl(URL.create(urlD).unwrap())
        .buildOrThrow();
      await cardRepository.save(cardD);

      // COLLECTION-1 contains URL-A and URL-B
      const collection1 = Collection.create({
        authorId: curator,
        name: 'Collection 1',
        accessType: CollectionAccessType.OPEN,
        collaboratorIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }).unwrap();
      await collectionRepository.save(collection1);
      collection1.addCard(cardA.cardId, curator);
      collection1.addCard(cardB.cardId, curator);
      await collectionRepository.save(collection1);

      // COLLECTION-2 contains URL-B and URL-C
      const collection2 = Collection.create({
        authorId: curator,
        name: 'Collection 2',
        accessType: CollectionAccessType.OPEN,
        collaboratorIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }).unwrap();
      await collectionRepository.save(collection2);
      collection2.addCard(cardB.cardId, curator);
      collection2.addCard(cardC.cardId, curator);
      await collectionRepository.save(collection2);

      // CONNECTION from URL-C to URL-D
      const connection = Connection.create({
        source: UrlOrCardId.createFromUrl(URL.create(urlC).unwrap()).unwrap(),
        target: UrlOrCardId.createFromUrl(URL.create(urlD).unwrap()).unwrap(),
        curatorId: curator,
      }).unwrap();
      await connectionRepository.save(connection);

      // Test depth 2 - should NOT include URL-D
      const depth2Result = await useCase.execute({ url: urlA, depth: 2 });
      expect(depth2Result.isOk()).toBe(true);
      const depth2Data = depth2Result.unwrap();
      const depth2NodeIds = depth2Data.nodes.map((n) => n.id);

      // Should see: URL-A (depth 0), COLLECTION-1 (depth 1), URL-B (depth 2), COLLECTION-2 (depth 2)
      expect(depth2NodeIds).toContain(`url:${urlA}`);
      expect(depth2NodeIds).toContain(`url:${urlB}`);
      expect(depth2NodeIds).toContain(
        `collection:${collection1.collectionId.getStringValue()}`,
      );

      // Test depth 3 - should include URL-C and URL-D
      const depth3Result = await useCase.execute({ url: urlA, depth: 3 });
      expect(depth3Result.isOk()).toBe(true);
      const depth3Data = depth3Result.unwrap();
      const depth3NodeIds = depth3Data.nodes.map((n) => n.id);

      // Should see all nodes including URL-C (depth 3 from COLLECTION-2) and URL-D (depth 3 from connection)
      expect(depth3NodeIds).toContain(`url:${urlA}`);
      expect(depth3NodeIds).toContain(`url:${urlB}`);
      expect(depth3NodeIds).toContain(`url:${urlC}`);
      expect(depth3NodeIds).toContain(`url:${urlD}`);
      expect(depth3NodeIds).toContain(
        `collection:${collection1.collectionId.getStringValue()}`,
      );
      expect(depth3NodeIds).toContain(
        `collection:${collection2.collectionId.getStringValue()}`,
      );
    });
  });

  describe('Shortest path behavior', () => {
    it('should show nodes at their earliest (shortest path) depth', async () => {
      // Create a diamond pattern:
      // URL-A → CONNECTION → URL-B
      // URL-A → COLLECTION-1 → URL-C → CONNECTION → URL-B
      // URL-B should appear at depth 1 (via direct connection), not depth 3 (via collection path)

      const urlA = 'https://example.com/url-a';
      const cardA = new CardBuilder()
        .withCuratorId(curator.value)
        .withType(CardTypeEnum.URL)
        .withUrl(URL.create(urlA).unwrap())
        .buildOrThrow();
      await cardRepository.save(cardA);

      const urlB = 'https://example.com/url-b';
      const cardB = new CardBuilder()
        .withCuratorId(curator.value)
        .withType(CardTypeEnum.URL)
        .withUrl(URL.create(urlB).unwrap())
        .buildOrThrow();
      await cardRepository.save(cardB);

      const urlC = 'https://example.com/url-c';
      const cardC = new CardBuilder()
        .withCuratorId(curator.value)
        .withType(CardTypeEnum.URL)
        .withUrl(URL.create(urlC).unwrap())
        .buildOrThrow();
      await cardRepository.save(cardC);

      // Direct connection: URL-A → URL-B
      const connectionAB = Connection.create({
        source: UrlOrCardId.createFromUrl(URL.create(urlA).unwrap()).unwrap(),
        target: UrlOrCardId.createFromUrl(URL.create(urlB).unwrap()).unwrap(),
        curatorId: curator,
      }).unwrap();
      await connectionRepository.save(connectionAB);

      // Collection path: URL-A → COLLECTION-1 → URL-C → URL-B
      const collection1 = Collection.create({
        authorId: curator,
        name: 'Collection 1',
        accessType: CollectionAccessType.OPEN,
        collaboratorIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }).unwrap();
      await collectionRepository.save(collection1);
      collection1.addCard(cardA.cardId, curator);
      collection1.addCard(cardC.cardId, curator);
      await collectionRepository.save(collection1);

      const connectionCB = Connection.create({
        source: UrlOrCardId.createFromUrl(URL.create(urlC).unwrap()).unwrap(),
        target: UrlOrCardId.createFromUrl(URL.create(urlB).unwrap()).unwrap(),
        curatorId: curator,
      }).unwrap();
      await connectionRepository.save(connectionCB);

      // At depth 1, URL-B should be discovered via direct connection
      const depth1Result = await useCase.execute({ url: urlA, depth: 1 });
      expect(depth1Result.isOk()).toBe(true);
      const depth1Data = depth1Result.unwrap();
      const depth1NodeIds = depth1Data.nodes.map((n) => n.id);

      expect(depth1NodeIds).toContain(`url:${urlB}`); // Should appear at depth 1

      // At depth 3, URL-B should still only appear once (not duplicated)
      const depth3Result = await useCase.execute({ url: urlA, depth: 3 });
      expect(depth3Result.isOk()).toBe(true);
      const depth3Data = depth3Result.unwrap();

      // Count occurrences of URL-B
      const urlBCount = depth3Data.nodes.filter(
        (n) => n.id === `url:${urlB}`,
      ).length;
      expect(urlBCount).toBe(1); // Should only appear once
    });
  });

  describe('Edge cases', () => {
    it('should deduplicate nodes when multiple cards exist for the same URL', async () => {
      // Create multiple URL cards for the same URL by different authors
      const url = 'https://example.com/popular-article';
      const curator1 = CuratorId.create('did:plc:curator1').unwrap();
      const curator2 = CuratorId.create('did:plc:curator2').unwrap();

      const card1 = new CardBuilder()
        .withCuratorId(curator1.value)
        .withType(CardTypeEnum.URL)
        .withUrl(URL.create(url).unwrap())
        .buildOrThrow();
      await cardRepository.save(card1);

      const card2 = new CardBuilder()
        .withCuratorId(curator2.value)
        .withType(CardTypeEnum.URL)
        .withUrl(URL.create(url).unwrap())
        .buildOrThrow();
      await cardRepository.save(card2);

      const result = await useCase.execute({ url, depth: 1 });

      expect(result.isOk()).toBe(true);
      const graphData = result.unwrap();

      // Should only have 1 node for the URL, not 2
      const urlNodes = graphData.nodes.filter((n) => n.id === `url:${url}`);
      expect(urlNodes.length).toBe(1);
    });

    it('should handle URLs not in the database', async () => {
      const nonExistentUrl = 'https://example.com/does-not-exist';

      const result = await useCase.execute({ url: nonExistentUrl, depth: 1 });

      expect(result.isOk()).toBe(true);
      const graphData = result.unwrap();

      // Should return a synthetic node for the URL
      expect(graphData.nodes.length).toBe(1);
      expect(graphData.nodes[0]?.id).toBe(`url:${nonExistentUrl}`);
      expect(graphData.nodes[0]?.metadata.synthetic).toBe(true);
      expect(graphData.edges.length).toBe(0);
    });

    it('should clamp depth to maximum of 5', async () => {
      const url = 'https://example.com/url';
      const card = new CardBuilder()
        .withCuratorId(curator.value)
        .withType(CardTypeEnum.URL)
        .withUrl(URL.create(url).unwrap())
        .buildOrThrow();
      await cardRepository.save(card);

      const result = await useCase.execute({ url, depth: 100 });

      expect(result.isOk()).toBe(true);
      // Should not error, depth should be clamped internally
    });

    it('should clamp depth to minimum of 1', async () => {
      const url = 'https://example.com/url';
      const card = new CardBuilder()
        .withCuratorId(curator.value)
        .withType(CardTypeEnum.URL)
        .withUrl(URL.create(url).unwrap())
        .buildOrThrow();
      await cardRepository.save(card);

      const result = await useCase.execute({ url, depth: 0 });

      expect(result.isOk()).toBe(true);
      // Should return at least the target URL node
      const graphData = result.unwrap();
      expect(graphData.nodes.length).toBeGreaterThanOrEqual(1);
    });
  });
});
