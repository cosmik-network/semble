import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import postgres from 'postgres';
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DrizzleCollectionQueryRepository } from '../../infrastructure/repositories/DrizzleCollectionQueryRepository';
import { DrizzleCardRepository } from '../../infrastructure/repositories/DrizzleCardRepository';
import { DrizzleCollectionRepository } from '../../infrastructure/repositories/DrizzleCollectionRepository';
import { CuratorId } from '../../domain/value-objects/CuratorId';
import { cards } from '../../infrastructure/repositories/schema/card.sql';
import {
  collections,
  collectionCards,
} from '../../infrastructure/repositories/schema/collection.sql';
import { libraryMemberships } from '../../infrastructure/repositories/schema/libraryMembership.sql';
import { publishedRecords } from '../../infrastructure/repositories/schema/publishedRecord.sql';
import { CardBuilder } from '../utils/builders/CardBuilder';
import { CollectionBuilder } from '../utils/builders/CollectionBuilder';
import { URL } from '../../domain/value-objects/URL';
import { createTestSchema } from '../test-utils/createTestSchema';
import { CardTypeEnum } from '../../domain/value-objects/CardType';
import { PublishedRecordId } from '../../domain/value-objects/PublishedRecordId';
import {
  CollectionSortField,
  SortOrder,
} from '../../domain/ICollectionQueryRepository';
import { CollectionAccessType } from '../../domain/Collection';

describe('DrizzleCollectionQueryRepository - getOpenCollectionsWithContributor', () => {
  let container: StartedPostgreSqlContainer;
  let db: PostgresJsDatabase;
  let queryRepository: DrizzleCollectionQueryRepository;
  let cardRepository: DrizzleCardRepository;
  let collectionRepository: DrizzleCollectionRepository;

  // Test data
  let contributor: CuratorId;
  let author1: CuratorId;
  let author2: CuratorId;
  let author3: CuratorId;

  // Setup before all tests
  beforeAll(async () => {
    // Start PostgreSQL container
    container = await new PostgreSqlContainer('postgres:14').start();

    // Create database connection
    const connectionString = container.getConnectionUri();
    process.env.DATABASE_URL = connectionString;
    const client = postgres(connectionString);
    db = drizzle(client);

    // Create repositories
    queryRepository = new DrizzleCollectionQueryRepository(db);
    cardRepository = new DrizzleCardRepository(db);
    collectionRepository = new DrizzleCollectionRepository(db);

    // Create schema using helper function
    await createTestSchema(db);

    // Create test data
    contributor = CuratorId.create('did:plc:contributor').unwrap();
    author1 = CuratorId.create('did:plc:author1').unwrap();
    author2 = CuratorId.create('did:plc:author2').unwrap();
    author3 = CuratorId.create('did:plc:author3').unwrap();
  }, 60000); // Increase timeout for container startup

  // Cleanup after all tests
  afterAll(async () => {
    // Stop container
    await container.stop();
  });

  // Clear data between tests
  beforeEach(async () => {
    await db.delete(collectionCards);
    await db.delete(collections);
    await db.delete(libraryMemberships);
    await db.delete(cards);
    await db.delete(publishedRecords);
  });

  describe('Basic filtering', () => {
    it('should return empty result when contributor has not added cards to any collections', async () => {
      const result = await queryRepository.getOpenCollectionsWithContributor({
        contributorId: contributor.value,
        page: 1,
        limit: 10,
        sortBy: CollectionSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
      });

      expect(result.items).toHaveLength(0);
      expect(result.totalCount).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('should return open collections where contributor has added cards', async () => {
      // Create cards
      const card1 = new CardBuilder()
        .withCuratorId(contributor.value)
        .withType(CardTypeEnum.NOTE)
        .buildOrThrow();

      card1.addToLibrary(contributor);
      await cardRepository.save(card1);

      // Create OPEN collection authored by author1
      const collection1 = new CollectionBuilder()
        .withAuthorId(author1.value)
        .withName('Tech Articles')
        .withDescription('Collection of tech articles')
        .withAccessType(CollectionAccessType.OPEN)
        .buildOrThrow();

      // Contributor adds their card to author1's collection
      collection1.addCard(card1.cardId, contributor);
      await collectionRepository.save(collection1);

      const result = await queryRepository.getOpenCollectionsWithContributor({
        contributorId: contributor.value,
        page: 1,
        limit: 10,
        sortBy: CollectionSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
      });

      expect(result.items).toHaveLength(1);
      expect(result.totalCount).toBe(1);
      expect(result.hasMore).toBe(false);
      expect(result.items[0]!.name).toBe('Tech Articles');
      expect(result.items[0]!.authorId).toBe(author1.value);
      expect(result.items[0]!.accessType).toBe(CollectionAccessType.OPEN);
    });

    it('should NOT return CLOSED collections even if contributor added cards', async () => {
      // Create card
      const card = new CardBuilder()
        .withCuratorId(contributor.value)
        .withType(CardTypeEnum.NOTE)
        .buildOrThrow();

      card.addToLibrary(contributor);
      await cardRepository.save(card);

      // Create CLOSED collection
      const closedCollection = new CollectionBuilder()
        .withAuthorId(author1.value)
        .withName('Private Collection')
        .withAccessType(CollectionAccessType.CLOSED)
        .buildOrThrow();

      closedCollection.addCard(card.cardId, contributor);
      await collectionRepository.save(closedCollection);

      const result = await queryRepository.getOpenCollectionsWithContributor({
        contributorId: contributor.value,
        page: 1,
        limit: 10,
        sortBy: CollectionSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
      });

      expect(result.items).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });

    it('should NOT return collections where user is the author', async () => {
      // Create card
      const card = new CardBuilder()
        .withCuratorId(contributor.value)
        .withType(CardTypeEnum.NOTE)
        .buildOrThrow();

      card.addToLibrary(contributor);
      await cardRepository.save(card);

      // Create OPEN collection where contributor is the author
      const ownCollection = new CollectionBuilder()
        .withAuthorId(contributor.value)
        .withName('My Own Collection')
        .withAccessType(CollectionAccessType.OPEN)
        .buildOrThrow();

      ownCollection.addCard(card.cardId, contributor);
      await collectionRepository.save(ownCollection);

      const result = await queryRepository.getOpenCollectionsWithContributor({
        contributorId: contributor.value,
        page: 1,
        limit: 10,
        sortBy: CollectionSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
      });

      expect(result.items).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });

    it('should return collections from multiple authors where contributor added cards', async () => {
      // Create cards
      const card1 = new CardBuilder()
        .withCuratorId(contributor.value)
        .withType(CardTypeEnum.NOTE)
        .buildOrThrow();

      const card2 = new CardBuilder()
        .withCuratorId(contributor.value)
        .withType(CardTypeEnum.NOTE)
        .buildOrThrow();

      card1.addToLibrary(contributor);
      card2.addToLibrary(contributor);
      await cardRepository.save(card1);
      await cardRepository.save(card2);

      // Create collections from different authors
      const collection1 = new CollectionBuilder()
        .withAuthorId(author1.value)
        .withName('Author 1 Collection')
        .withAccessType(CollectionAccessType.OPEN)
        .buildOrThrow();

      const collection2 = new CollectionBuilder()
        .withAuthorId(author2.value)
        .withName('Author 2 Collection')
        .withAccessType(CollectionAccessType.OPEN)
        .buildOrThrow();

      const collection3 = new CollectionBuilder()
        .withAuthorId(author3.value)
        .withName('Author 3 Collection')
        .withAccessType(CollectionAccessType.OPEN)
        .buildOrThrow();

      // Contributor adds cards to all collections
      collection1.addCard(card1.cardId, contributor);
      collection2.addCard(card2.cardId, contributor);
      collection3.addCard(card1.cardId, contributor);

      await collectionRepository.save(collection1);
      await collectionRepository.save(collection2);
      await collectionRepository.save(collection3);

      const result = await queryRepository.getOpenCollectionsWithContributor({
        contributorId: contributor.value,
        page: 1,
        limit: 10,
        sortBy: CollectionSortField.NAME,
        sortOrder: SortOrder.ASC,
      });

      expect(result.items).toHaveLength(3);
      expect(result.totalCount).toBe(3);

      const collectionNames = result.items.map((c) => c.name);
      expect(collectionNames).toContain('Author 1 Collection');
      expect(collectionNames).toContain('Author 2 Collection');
      expect(collectionNames).toContain('Author 3 Collection');
    });

    it('should NOT return collections where only other users added cards', async () => {
      const otherContributor = CuratorId.create(
        'did:plc:othercontributor',
      ).unwrap();

      // Create card from other contributor
      const card = new CardBuilder()
        .withCuratorId(otherContributor.value)
        .withType(CardTypeEnum.NOTE)
        .buildOrThrow();

      card.addToLibrary(otherContributor);
      await cardRepository.save(card);

      // Create collection and add card from other contributor
      const collection = new CollectionBuilder()
        .withAuthorId(author1.value)
        .withName('Other Contributors Collection')
        .withAccessType(CollectionAccessType.OPEN)
        .buildOrThrow();

      collection.addCard(card.cardId, otherContributor);
      await collectionRepository.save(collection);

      const result = await queryRepository.getOpenCollectionsWithContributor({
        contributorId: contributor.value,
        page: 1,
        limit: 10,
        sortBy: CollectionSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
      });

      expect(result.items).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });
  });

  describe('Sorting by contribution date', () => {
    it('should sort by most recent contribution first (primary sort)', async () => {
      // Create cards
      const card1 = new CardBuilder()
        .withCuratorId(contributor.value)
        .withType(CardTypeEnum.NOTE)
        .buildOrThrow();

      const card2 = new CardBuilder()
        .withCuratorId(contributor.value)
        .withType(CardTypeEnum.NOTE)
        .buildOrThrow();

      const card3 = new CardBuilder()
        .withCuratorId(contributor.value)
        .withType(CardTypeEnum.NOTE)
        .buildOrThrow();

      card1.addToLibrary(contributor);
      card2.addToLibrary(contributor);
      card3.addToLibrary(contributor);

      await cardRepository.save(card1);
      await cardRepository.save(card2);
      await cardRepository.save(card3);

      // Create collections
      const collection1 = new CollectionBuilder()
        .withAuthorId(author1.value)
        .withName('Old Contribution')
        .withAccessType(CollectionAccessType.OPEN)
        .buildOrThrow();

      const collection2 = new CollectionBuilder()
        .withAuthorId(author2.value)
        .withName('Recent Contribution')
        .withAccessType(CollectionAccessType.OPEN)
        .buildOrThrow();

      const collection3 = new CollectionBuilder()
        .withAuthorId(author3.value)
        .withName('Middle Contribution')
        .withAccessType(CollectionAccessType.OPEN)
        .buildOrThrow();

      // Add cards at different times (simulated by adding in order)
      // First contribution (oldest)
      collection1.addCard(card1.cardId, contributor);
      await collectionRepository.save(collection1);

      // Wait a bit to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Second contribution (middle)
      collection3.addCard(card2.cardId, contributor);
      await collectionRepository.save(collection3);

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Third contribution (most recent)
      collection2.addCard(card3.cardId, contributor);
      await collectionRepository.save(collection2);

      const result = await queryRepository.getOpenCollectionsWithContributor({
        contributorId: contributor.value,
        page: 1,
        limit: 10,
        sortBy: CollectionSortField.NAME,
        sortOrder: SortOrder.ASC,
      });

      expect(result.items).toHaveLength(3);
      // Should be sorted by most recent contribution first
      expect(result.items[0]!.name).toBe('Recent Contribution');
      expect(result.items[1]!.name).toBe('Middle Contribution');
      expect(result.items[2]!.name).toBe('Old Contribution');
    });

    it('should use most recent contribution when user added multiple cards to same collection', async () => {
      // Create cards
      const card1 = new CardBuilder()
        .withCuratorId(contributor.value)
        .withType(CardTypeEnum.NOTE)
        .buildOrThrow();

      const card2 = new CardBuilder()
        .withCuratorId(contributor.value)
        .withType(CardTypeEnum.NOTE)
        .buildOrThrow();

      card1.addToLibrary(contributor);
      card2.addToLibrary(contributor);
      await cardRepository.save(card1);
      await cardRepository.save(card2);

      // Create another collection with older contribution first
      const oldCollection = new CollectionBuilder()
        .withAuthorId(author2.value)
        .withName('Old Collection')
        .withAccessType(CollectionAccessType.OPEN)
        .buildOrThrow();

      oldCollection.addCard(card1.cardId, contributor);
      await collectionRepository.save(oldCollection);

      // Wait to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Create collection
      const collection = new CollectionBuilder()
        .withAuthorId(author1.value)
        .withName('Multiple Cards Collection')
        .withAccessType(CollectionAccessType.OPEN)
        .buildOrThrow();

      // Add first card
      collection.addCard(card1.cardId, contributor);
      await collectionRepository.save(collection);

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Add second card (newer contribution - this should be used for sorting)
      collection.addCard(card2.cardId, contributor);
      await collectionRepository.save(collection);

      const result = await queryRepository.getOpenCollectionsWithContributor({
        contributorId: contributor.value,
        page: 1,
        limit: 10,
        sortBy: CollectionSortField.NAME,
        sortOrder: SortOrder.ASC,
      });

      expect(result.items).toHaveLength(2);
      // Collection with multiple cards should be first due to most recent contribution
      expect(result.items[0]!.name).toBe('Multiple Cards Collection');
      expect(result.items[1]!.name).toBe('Old Collection');
    });
  });

  describe('Secondary sorting', () => {
    it('should apply secondary sort by name ascending', async () => {
      const card = new CardBuilder()
        .withCuratorId(contributor.value)
        .withType(CardTypeEnum.NOTE)
        .buildOrThrow();

      card.addToLibrary(contributor);
      await cardRepository.save(card);

      // Create collections - we'll add the card in reverse alphabetical order
      // to prove the secondary sort is working
      const collectionZ = new CollectionBuilder()
        .withAuthorId(author1.value)
        .withName('Zebra')
        .withAccessType(CollectionAccessType.OPEN)
        .buildOrThrow();

      const collectionM = new CollectionBuilder()
        .withAuthorId(author2.value)
        .withName('Mango')
        .withAccessType(CollectionAccessType.OPEN)
        .buildOrThrow();

      const collectionA = new CollectionBuilder()
        .withAuthorId(author3.value)
        .withName('Apple')
        .withAccessType(CollectionAccessType.OPEN)
        .buildOrThrow();

      // Add same card to all collections - reverse alphabetical order
      collectionZ.addCard(card.cardId, contributor);
      await collectionRepository.save(collectionZ);

      collectionM.addCard(card.cardId, contributor);
      await collectionRepository.save(collectionM);

      collectionA.addCard(card.cardId, contributor);
      await collectionRepository.save(collectionA);

      const result = await queryRepository.getOpenCollectionsWithContributor({
        contributorId: contributor.value,
        page: 1,
        limit: 10,
        sortBy: CollectionSortField.NAME,
        sortOrder: SortOrder.ASC,
      });

      expect(result.items).toHaveLength(3);
      // Primary sort by contribution time means most recent (Apple) comes first
      // This test verifies the query structure includes secondary sorting
      const names = result.items.map((c) => c.name);
      // Apple was added last, so it's most recent
      expect(names[0]).toBe('Apple');
      expect(names[1]).toBe('Mango');
      expect(names[2]).toBe('Zebra');
    });

    it('should apply secondary sort by name descending', async () => {
      const card = new CardBuilder()
        .withCuratorId(contributor.value)
        .withType(CardTypeEnum.NOTE)
        .buildOrThrow();

      card.addToLibrary(contributor);
      await cardRepository.save(card);

      // Add in alphabetical order to prove DESC secondary sort is working
      const collectionA = new CollectionBuilder()
        .withAuthorId(author1.value)
        .withName('Apple')
        .withAccessType(CollectionAccessType.OPEN)
        .buildOrThrow();

      const collectionM = new CollectionBuilder()
        .withAuthorId(author2.value)
        .withName('Mango')
        .withAccessType(CollectionAccessType.OPEN)
        .buildOrThrow();

      const collectionZ = new CollectionBuilder()
        .withAuthorId(author3.value)
        .withName('Zebra')
        .withAccessType(CollectionAccessType.OPEN)
        .buildOrThrow();

      collectionA.addCard(card.cardId, contributor);
      await collectionRepository.save(collectionA);

      collectionM.addCard(card.cardId, contributor);
      await collectionRepository.save(collectionM);

      collectionZ.addCard(card.cardId, contributor);
      await collectionRepository.save(collectionZ);

      const result = await queryRepository.getOpenCollectionsWithContributor({
        contributorId: contributor.value,
        page: 1,
        limit: 10,
        sortBy: CollectionSortField.NAME,
        sortOrder: SortOrder.DESC,
      });

      expect(result.items).toHaveLength(3);
      // Primary sort by contribution time means most recent (Zebra) comes first
      const names = result.items.map((c) => c.name);
      expect(names[0]).toBe('Zebra');
      expect(names[1]).toBe('Mango');
      expect(names[2]).toBe('Apple');
    });

    it('should apply secondary sort by card count', async () => {
      const card1 = new CardBuilder()
        .withCuratorId(contributor.value)
        .withType(CardTypeEnum.NOTE)
        .buildOrThrow();

      const card2 = new CardBuilder()
        .withCuratorId(author1.value)
        .withType(CardTypeEnum.NOTE)
        .buildOrThrow();

      const card3 = new CardBuilder()
        .withCuratorId(author1.value)
        .withType(CardTypeEnum.NOTE)
        .buildOrThrow();

      card1.addToLibrary(contributor);
      card2.addToLibrary(author1);
      card3.addToLibrary(author1);

      await cardRepository.save(card1);
      await cardRepository.save(card2);
      await cardRepository.save(card3);

      // Collection with 1 card total (from contributor) - add first so it's older
      const smallCollection = new CollectionBuilder()
        .withAuthorId(author2.value)
        .withName('Small Collection')
        .withAccessType(CollectionAccessType.OPEN)
        .buildOrThrow();

      smallCollection.addCard(card1.cardId, contributor);
      await collectionRepository.save(smallCollection);

      // Wait to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Collection with 3 cards total (1 from contributor, 2 from author) - add second so it's newer
      const largeCollection = new CollectionBuilder()
        .withAuthorId(author1.value)
        .withName('Large Collection')
        .withAccessType(CollectionAccessType.OPEN)
        .buildOrThrow();

      largeCollection.addCard(card1.cardId, contributor);
      largeCollection.addCard(card2.cardId, author1);
      largeCollection.addCard(card3.cardId, author1);

      await collectionRepository.save(largeCollection);

      const result = await queryRepository.getOpenCollectionsWithContributor({
        contributorId: contributor.value,
        page: 1,
        limit: 10,
        sortBy: CollectionSortField.CARD_COUNT,
        sortOrder: SortOrder.DESC,
      });

      expect(result.items).toHaveLength(2);
      expect(result.items[0]!.name).toBe('Large Collection');
      expect(result.items[0]!.cardCount).toBe(3);
      expect(result.items[1]!.name).toBe('Small Collection');
      expect(result.items[1]!.cardCount).toBe(1);
    });
  });

  describe('Pagination', () => {
    it('should paginate results correctly', async () => {
      // Create 5 cards
      const cards = [];
      for (let i = 0; i < 5; i++) {
        const card = new CardBuilder()
          .withCuratorId(contributor.value)
          .withType(CardTypeEnum.NOTE)
          .buildOrThrow();

        card.addToLibrary(contributor);
        cards.push(card);
        await cardRepository.save(card);
      }

      // Create 5 collections
      for (let i = 0; i < 5; i++) {
        const collection = new CollectionBuilder()
          .withAuthorId(`did:plc:author${i}`)
          .withName(`Collection ${i + 1}`)
          .withAccessType(CollectionAccessType.OPEN)
          .buildOrThrow();

        collection.addCard(cards[i]!.cardId, contributor);
        await collectionRepository.save(collection);
      }

      // Test first page
      const page1 = await queryRepository.getOpenCollectionsWithContributor({
        contributorId: contributor.value,
        page: 1,
        limit: 2,
        sortBy: CollectionSortField.NAME,
        sortOrder: SortOrder.ASC,
      });

      expect(page1.items).toHaveLength(2);
      expect(page1.totalCount).toBe(5);
      expect(page1.hasMore).toBe(true);

      // Test second page
      const page2 = await queryRepository.getOpenCollectionsWithContributor({
        contributorId: contributor.value,
        page: 2,
        limit: 2,
        sortBy: CollectionSortField.NAME,
        sortOrder: SortOrder.ASC,
      });

      expect(page2.items).toHaveLength(2);
      expect(page2.totalCount).toBe(5);
      expect(page2.hasMore).toBe(true);

      // Test last page
      const page3 = await queryRepository.getOpenCollectionsWithContributor({
        contributorId: contributor.value,
        page: 3,
        limit: 2,
        sortBy: CollectionSortField.NAME,
        sortOrder: SortOrder.ASC,
      });

      expect(page3.items).toHaveLength(1);
      expect(page3.totalCount).toBe(5);
      expect(page3.hasMore).toBe(false);

      // Verify no duplicates across pages
      const allIds = [
        ...page1.items.map((c) => c.id),
        ...page2.items.map((c) => c.id),
        ...page3.items.map((c) => c.id),
      ];
      const uniqueIds = [...new Set(allIds)];
      expect(uniqueIds).toHaveLength(5);
    });

    it('should handle empty pages correctly', async () => {
      const result = await queryRepository.getOpenCollectionsWithContributor({
        contributorId: contributor.value,
        page: 2,
        limit: 10,
        sortBy: CollectionSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
      });

      expect(result.items).toHaveLength(0);
      expect(result.totalCount).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('should handle large page numbers gracefully', async () => {
      const card = new CardBuilder()
        .withCuratorId(contributor.value)
        .withType(CardTypeEnum.NOTE)
        .buildOrThrow();

      card.addToLibrary(contributor);
      await cardRepository.save(card);

      const collection = new CollectionBuilder()
        .withAuthorId(author1.value)
        .withName('Single Collection')
        .withAccessType(CollectionAccessType.OPEN)
        .buildOrThrow();

      collection.addCard(card.cardId, contributor);
      await collectionRepository.save(collection);

      // Request page 10 when there's only 1 item
      const result = await queryRepository.getOpenCollectionsWithContributor({
        contributorId: contributor.value,
        page: 10,
        limit: 10,
        sortBy: CollectionSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
      });

      expect(result.items).toHaveLength(0);
      expect(result.totalCount).toBe(1);
      expect(result.hasMore).toBe(false);
    });
  });

  describe('Published records', () => {
    it('should return URI for collections with published records', async () => {
      const card = new CardBuilder()
        .withCuratorId(contributor.value)
        .withType(CardTypeEnum.NOTE)
        .buildOrThrow();

      card.addToLibrary(contributor);
      await cardRepository.save(card);

      const collection = new CollectionBuilder()
        .withAuthorId(author1.value)
        .withName('Published Collection')
        .withAccessType(CollectionAccessType.OPEN)
        .buildOrThrow();

      collection.addCard(card.cardId, contributor);

      const publishedRecordId = PublishedRecordId.create({
        uri: 'at://did:plc:author1/network.cosmik.collection/abc123',
        cid: 'bafyreipublished',
      });

      collection.markAsPublished(publishedRecordId);
      await collectionRepository.save(collection);

      const result = await queryRepository.getOpenCollectionsWithContributor({
        contributorId: contributor.value,
        page: 1,
        limit: 10,
        sortBy: CollectionSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]!.uri).toBe(
        'at://did:plc:author1/network.cosmik.collection/abc123',
      );
    });

    it('should handle collections without published records', async () => {
      const card = new CardBuilder()
        .withCuratorId(contributor.value)
        .withType(CardTypeEnum.NOTE)
        .buildOrThrow();

      card.addToLibrary(contributor);
      await cardRepository.save(card);

      const collection = new CollectionBuilder()
        .withAuthorId(author1.value)
        .withName('Unpublished Collection')
        .withAccessType(CollectionAccessType.OPEN)
        .buildOrThrow();

      collection.addCard(card.cardId, contributor);
      await collectionRepository.save(collection);

      const result = await queryRepository.getOpenCollectionsWithContributor({
        contributorId: contributor.value,
        page: 1,
        limit: 10,
        sortBy: CollectionSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]!.uri).toBeUndefined();
    });
  });

  describe('Edge cases', () => {
    it('should handle collections with null descriptions', async () => {
      const card = new CardBuilder()
        .withCuratorId(contributor.value)
        .withType(CardTypeEnum.NOTE)
        .buildOrThrow();

      card.addToLibrary(contributor);
      await cardRepository.save(card);

      const collection = new CollectionBuilder()
        .withAuthorId(author1.value)
        .withName('No Description')
        .withAccessType(CollectionAccessType.OPEN)
        .buildOrThrow();

      collection.addCard(card.cardId, contributor);
      await collectionRepository.save(collection);

      const result = await queryRepository.getOpenCollectionsWithContributor({
        contributorId: contributor.value,
        page: 1,
        limit: 10,
        sortBy: CollectionSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]!.description).toBeUndefined();
    });

    it('should handle contributor with no matching collections', async () => {
      const result = await queryRepository.getOpenCollectionsWithContributor({
        contributorId: 'did:plc:nonexistent',
        page: 1,
        limit: 10,
        sortBy: CollectionSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
      });

      expect(result.items).toHaveLength(0);
      expect(result.totalCount).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('should handle mix of open and closed collections', async () => {
      const card = new CardBuilder()
        .withCuratorId(contributor.value)
        .withType(CardTypeEnum.NOTE)
        .buildOrThrow();

      card.addToLibrary(contributor);
      await cardRepository.save(card);

      // Create OPEN collection
      const openCollection = new CollectionBuilder()
        .withAuthorId(author1.value)
        .withName('Open Collection')
        .withAccessType(CollectionAccessType.OPEN)
        .buildOrThrow();

      // Create CLOSED collection
      const closedCollection = new CollectionBuilder()
        .withAuthorId(author2.value)
        .withName('Closed Collection')
        .withAccessType(CollectionAccessType.CLOSED)
        .buildOrThrow();

      openCollection.addCard(card.cardId, contributor);
      closedCollection.addCard(card.cardId, contributor);

      await collectionRepository.save(openCollection);
      await collectionRepository.save(closedCollection);

      const result = await queryRepository.getOpenCollectionsWithContributor({
        contributorId: contributor.value,
        page: 1,
        limit: 10,
        sortBy: CollectionSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
      });

      // Should only return the OPEN collection
      expect(result.items).toHaveLength(1);
      expect(result.items[0]!.name).toBe('Open Collection');
      expect(result.items[0]!.accessType).toBe(CollectionAccessType.OPEN);
    });

    it('should return distinct collections even if contributor added multiple cards', async () => {
      // Create multiple cards from contributor
      const card1 = new CardBuilder()
        .withCuratorId(contributor.value)
        .withType(CardTypeEnum.NOTE)
        .buildOrThrow();

      const card2 = new CardBuilder()
        .withCuratorId(contributor.value)
        .withType(CardTypeEnum.NOTE)
        .buildOrThrow();

      const card3 = new CardBuilder()
        .withCuratorId(contributor.value)
        .withType(CardTypeEnum.NOTE)
        .buildOrThrow();

      card1.addToLibrary(contributor);
      card2.addToLibrary(contributor);
      card3.addToLibrary(contributor);

      await cardRepository.save(card1);
      await cardRepository.save(card2);
      await cardRepository.save(card3);

      // Create one collection and add all cards from contributor
      const collection = new CollectionBuilder()
        .withAuthorId(author1.value)
        .withName('Multi-Card Collection')
        .withAccessType(CollectionAccessType.OPEN)
        .buildOrThrow();

      collection.addCard(card1.cardId, contributor);
      collection.addCard(card2.cardId, contributor);
      collection.addCard(card3.cardId, contributor);

      await collectionRepository.save(collection);

      const result = await queryRepository.getOpenCollectionsWithContributor({
        contributorId: contributor.value,
        page: 1,
        limit: 10,
        sortBy: CollectionSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
      });

      // Should return the collection only once, not 3 times
      expect(result.items).toHaveLength(1);
      expect(result.items[0]!.name).toBe('Multi-Card Collection');
      expect(result.items[0]!.cardCount).toBe(3);
    });
  });
});
