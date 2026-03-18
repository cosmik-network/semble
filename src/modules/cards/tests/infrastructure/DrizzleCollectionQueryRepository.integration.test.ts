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
import { UniqueEntityID } from '../../../../shared/domain/UniqueEntityID';
import {
  collections,
  collectionCollaborators,
  collectionCards,
} from '../../infrastructure/repositories/schema/collection.sql';
import { cards } from '../../infrastructure/repositories/schema/card.sql';
import { libraryMemberships } from '../../infrastructure/repositories/schema/libraryMembership.sql';
import { publishedRecords } from '../../infrastructure/repositories/schema/publishedRecord.sql';
import { Collection, CollectionAccessType } from '../../domain/Collection';
import { CardFactory } from '../../domain/CardFactory';
import { CardTypeEnum } from '../../domain/value-objects/CardType';
import {
  CollectionSortField,
  SortOrder,
} from '../../domain/ICollectionQueryRepository';
import { createTestSchema } from '../test-utils/createTestSchema';
import { CollectionBuilder } from '../utils/builders/CollectionBuilder';
import { FakeCollectionPublisher } from '../utils/FakeCollectionPublisher';

describe('DrizzleCollectionQueryRepository', () => {
  let container: StartedPostgreSqlContainer;
  let db: PostgresJsDatabase;
  let queryRepository: DrizzleCollectionQueryRepository;
  let collectionRepository: DrizzleCollectionRepository;
  let cardRepository: DrizzleCardRepository;
  let fakePublisher: FakeCollectionPublisher;

  // Test data
  let curatorId: CuratorId;
  let otherCuratorId: CuratorId;

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
    collectionRepository = new DrizzleCollectionRepository(db);
    cardRepository = new DrizzleCardRepository(db);
    fakePublisher = new FakeCollectionPublisher();

    // Create schema using helper function
    await createTestSchema(db);

    // Create test data
    curatorId = CuratorId.create('did:plc:testcurator').unwrap();
    otherCuratorId = CuratorId.create('did:plc:othercurator').unwrap();
  }, 60000); // Increase timeout for container startup

  // Cleanup after all tests
  afterAll(async () => {
    // Stop container
    await container.stop();
  });

  // Clear data between tests
  beforeEach(async () => {
    await db.delete(collectionCards);
    await db.delete(collectionCollaborators);
    await db.delete(collections);
    await db.delete(libraryMemberships);
    await db.delete(cards);
    await db.delete(publishedRecords);
    // Clear fake publisher state between tests
    fakePublisher.clear();
  });

  describe('findByCreator', () => {
    it('should return empty result when curator has no collections', async () => {
      const result = await queryRepository.findByCreator(curatorId.value, {
        page: 1,
        limit: 10,
        sortBy: CollectionSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
      });

      expect(result.items).toHaveLength(0);
      expect(result.totalCount).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('should return collections for a curator', async () => {
      // Create test collections
      const collection1 = Collection.create(
        {
          authorId: curatorId,
          name: 'First Collection',
          description: 'First description',
          accessType: CollectionAccessType.OPEN,
          collaboratorIds: [],
          createdAt: new Date('2023-01-01'),
          updatedAt: new Date('2023-01-01'),
        },
        new UniqueEntityID(),
      ).unwrap();

      const collection2 = Collection.create(
        {
          authorId: curatorId,
          name: 'Second Collection',
          accessType: CollectionAccessType.CLOSED,
          collaboratorIds: [],
          createdAt: new Date('2023-01-02'),
          updatedAt: new Date('2023-01-02'),
        },
        new UniqueEntityID(),
      ).unwrap();

      // Save collections
      await collectionRepository.create(collection1);
      await collectionRepository.create(collection2);

      // Query collections
      const result = await queryRepository.findByCreator(curatorId.value, {
        page: 1,
        limit: 10,
        sortBy: CollectionSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
      });

      expect(result.items).toHaveLength(2);
      expect(result.totalCount).toBe(2);
      expect(result.hasMore).toBe(false);

      // Check collection data
      const names = result.items.map((item) => item.name);
      expect(names).toContain('First Collection');
      expect(names).toContain('Second Collection');

      // Check that all items have the correct curator
      result.items.forEach((item) => {
        expect(item.authorId).toBe(curatorId.value);
      });
    });

    it('should not return collections from other curators', async () => {
      // Create collection for other curator
      const otherCollection = Collection.create(
        {
          authorId: otherCuratorId,
          name: "Other's Collection",
          accessType: CollectionAccessType.OPEN,
          collaboratorIds: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        new UniqueEntityID(),
      ).unwrap();

      await collectionRepository.save(otherCollection);

      // Query collections for our curator
      const result = await queryRepository.findByCreator(curatorId.value, {
        page: 1,
        limit: 10,
        sortBy: CollectionSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
      });

      expect(result.items).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });

    it('should include card count for collections', async () => {
      // Create a card
      const cardResult = CardFactory.create({
        curatorId: curatorId.value,
        cardInput: {
          type: CardTypeEnum.NOTE,
          text: 'Test card',
        },
      });
      const card = cardResult.unwrap();
      await cardRepository.save(card);

      // Create collection with cards
      const collection = Collection.create(
        {
          authorId: curatorId,
          name: 'Collection with Cards',
          accessType: CollectionAccessType.OPEN,
          collaboratorIds: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        new UniqueEntityID(),
      ).unwrap();

      // Create collection first, then add card
      await collectionRepository.create(collection);
      collection.addCard(card.cardId, curatorId);
      await collectionRepository.save(collection);

      // Create collection without cards
      const emptyCollection = Collection.create(
        {
          authorId: curatorId,
          name: 'Empty Collection',
          accessType: CollectionAccessType.OPEN,
          collaboratorIds: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        new UniqueEntityID(),
      ).unwrap();

      await collectionRepository.create(emptyCollection);

      // Query collections
      const result = await queryRepository.findByCreator(curatorId.value, {
        page: 1,
        limit: 10,
        sortBy: CollectionSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
      });

      expect(result.items).toHaveLength(2);

      // Find the collections by name and check card counts
      const collectionWithCards = result.items.find(
        (item) => item.name === 'Collection with Cards',
      );
      const collectionWithoutCards = result.items.find(
        (item) => item.name === 'Empty Collection',
      );

      expect(collectionWithCards?.cardCount).toBe(1);
      expect(collectionWithoutCards?.cardCount).toBe(0);
    });
  });

  describe('sorting', () => {
    beforeEach(async () => {
      // Create test collections with different properties for sorting
      const collection1 = Collection.create(
        {
          authorId: curatorId,
          name: 'Alpha Collection',
          description: 'First alphabetically',
          accessType: CollectionAccessType.OPEN,
          collaboratorIds: [],
          createdAt: new Date('2023-01-01T10:00:00Z'),
          updatedAt: new Date('2023-01-03T10:00:00Z'), // Most recently updated
        },
        new UniqueEntityID(),
      ).unwrap();

      const collection2 = Collection.create(
        {
          authorId: curatorId,
          name: 'Beta Collection',
          description: 'Second alphabetically',
          accessType: CollectionAccessType.OPEN,
          collaboratorIds: [],
          createdAt: new Date('2023-01-02T10:00:00Z'), // Most recently created
          updatedAt: new Date('2023-01-02T10:00:00Z'),
        },
        new UniqueEntityID(),
      ).unwrap();

      const collection3 = Collection.create(
        {
          authorId: curatorId,
          name: 'Gamma Collection',
          description: 'Third alphabetically',
          accessType: CollectionAccessType.OPEN,
          collaboratorIds: [],
          createdAt: new Date('2023-01-01T09:00:00Z'), // Oldest created
          updatedAt: new Date('2023-01-01T09:00:00Z'), // Oldest updated
        },
        new UniqueEntityID(),
      ).unwrap();

      // Save collections
      await collectionRepository.create(collection1);
      await collectionRepository.create(collection2);
      await collectionRepository.create(collection3);

      // Create cards and add different numbers to collections for card count sorting
      const card1 = CardFactory.create({
        curatorId: curatorId.value,
        cardInput: { type: CardTypeEnum.NOTE, text: 'Card 1' },
      }).unwrap();
      const card2 = CardFactory.create({
        curatorId: curatorId.value,
        cardInput: { type: CardTypeEnum.NOTE, text: 'Card 2' },
      }).unwrap();
      const card3 = CardFactory.create({
        curatorId: curatorId.value,
        cardInput: { type: CardTypeEnum.NOTE, text: 'Card 3' },
      }).unwrap();

      await cardRepository.save(card1);
      await cardRepository.save(card2);
      await cardRepository.save(card3);

      // Add cards to collections: Gamma gets 3 cards, Beta gets 1, Alpha gets 0
      collection3.addCard(card1.cardId, curatorId);
      collection3.addCard(card2.cardId, curatorId);
      collection3.addCard(card3.cardId, curatorId);
      collection2.addCard(card1.cardId, curatorId);

      // Save to process the ADD_CARD commands
      await collectionRepository.save(collection2);
      await collectionRepository.save(collection3);
    });

    it('should sort by name ascending', async () => {
      const result = await queryRepository.findByCreator(curatorId.value, {
        page: 1,
        limit: 10,
        sortBy: CollectionSortField.NAME,
        sortOrder: SortOrder.ASC,
      });

      expect(result.items).toHaveLength(3);
      expect(result.items[0]?.name).toBe('Alpha Collection');
      expect(result.items[1]?.name).toBe('Beta Collection');
      expect(result.items[2]?.name).toBe('Gamma Collection');
    });

    it('should sort by name descending', async () => {
      const result = await queryRepository.findByCreator(curatorId.value, {
        page: 1,
        limit: 10,
        sortBy: CollectionSortField.NAME,
        sortOrder: SortOrder.DESC,
      });

      expect(result.items).toHaveLength(3);
      expect(result.items[0]?.name).toBe('Gamma Collection');
      expect(result.items[1]?.name).toBe('Beta Collection');
      expect(result.items[2]?.name).toBe('Alpha Collection');
    });

    it('should sort by created date ascending', async () => {
      const result = await queryRepository.findByCreator(curatorId.value, {
        page: 1,
        limit: 10,
        sortBy: CollectionSortField.CREATED_AT,
        sortOrder: SortOrder.ASC,
      });

      expect(result.items).toHaveLength(3);
      expect(result.items[0]?.name).toBe('Gamma Collection'); // Oldest
      expect(result.items[1]?.name).toBe('Alpha Collection');
      expect(result.items[2]?.name).toBe('Beta Collection'); // Newest
    });

    it('should sort by created date descending', async () => {
      const result = await queryRepository.findByCreator(curatorId.value, {
        page: 1,
        limit: 10,
        sortBy: CollectionSortField.CREATED_AT,
        sortOrder: SortOrder.DESC,
      });

      expect(result.items).toHaveLength(3);
      expect(result.items[0]?.name).toBe('Beta Collection'); // Newest
      expect(result.items[1]?.name).toBe('Alpha Collection');
      expect(result.items[2]?.name).toBe('Gamma Collection'); // Oldest
    });

    it('should sort by updated date ascending', async () => {
      const result = await queryRepository.findByCreator(curatorId.value, {
        page: 1,
        limit: 10,
        sortBy: CollectionSortField.UPDATED_AT,
        sortOrder: SortOrder.ASC,
      });

      expect(result.items).toHaveLength(3);
      expect(result.items[0]!.updatedAt.getTime()).toBeLessThanOrEqual(
        result.items[1]!.updatedAt.getTime(),
      );
      expect(result.items[1]!.updatedAt.getTime()).toBeLessThanOrEqual(
        result.items[2]!.updatedAt.getTime(),
      );
    });

    it('should sort by updated date descending (default)', async () => {
      const result = await queryRepository.findByCreator(curatorId.value, {
        page: 1,
        limit: 10,
        sortBy: CollectionSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
      });

      expect(result.items).toHaveLength(3);
      expect(result.items[0]!.updatedAt.getTime()).toBeGreaterThanOrEqual(
        result.items[1]!.updatedAt.getTime(),
      );
      expect(result.items[1]!.updatedAt.getTime()).toBeGreaterThanOrEqual(
        result.items[2]!.updatedAt.getTime(),
      );
    });

    it('should sort by card count ascending', async () => {
      const result = await queryRepository.findByCreator(curatorId.value, {
        page: 1,
        limit: 10,
        sortBy: CollectionSortField.CARD_COUNT,
        sortOrder: SortOrder.ASC,
      });

      expect(result.items).toHaveLength(3);
      expect(result.items[0]?.name).toBe('Alpha Collection'); // 0 cards
      expect(result.items[0]?.cardCount).toBe(0);
      expect(result.items[1]?.name).toBe('Beta Collection'); // 1 card
      expect(result.items[1]?.cardCount).toBe(1);
      expect(result.items[2]?.name).toBe('Gamma Collection'); // 3 cards
      expect(result.items[2]?.cardCount).toBe(3);
    });

    it('should sort by card count descending', async () => {
      const result = await queryRepository.findByCreator(curatorId.value, {
        page: 1,
        limit: 10,
        sortBy: CollectionSortField.CARD_COUNT,
        sortOrder: SortOrder.DESC,
      });

      expect(result.items).toHaveLength(3);
      expect(result.items[0]?.name).toBe('Gamma Collection'); // 3 cards
      expect(result.items[0]?.cardCount).toBe(3);
      expect(result.items[1]?.name).toBe('Beta Collection'); // 1 card
      expect(result.items[1]?.cardCount).toBe(1);
      expect(result.items[2]?.name).toBe('Alpha Collection'); // 0 cards
      expect(result.items[2]?.cardCount).toBe(0);
    });
  });

  describe('pagination', () => {
    beforeEach(async () => {
      // Create 5 test collections for pagination testing
      for (let i = 1; i <= 5; i++) {
        const collection = Collection.create(
          {
            authorId: curatorId,
            name: `Collection ${i.toString().padStart(2, '0')}`,
            description: `Description ${i}`,
            accessType: CollectionAccessType.OPEN,
            collaboratorIds: [],
            createdAt: new Date(`2023-01-${i.toString().padStart(2, '0')}`),
            updatedAt: new Date(`2023-01-${i.toString().padStart(2, '0')}`),
          },
          new UniqueEntityID(),
        ).unwrap();

        await collectionRepository.create(collection);
      }
    });

    it('should handle first page with limit', async () => {
      const result = await queryRepository.findByCreator(curatorId.value, {
        page: 1,
        limit: 2,
        sortBy: CollectionSortField.NAME,
        sortOrder: SortOrder.ASC,
      });

      expect(result.items).toHaveLength(2);
      expect(result.totalCount).toBe(5);
      expect(result.hasMore).toBe(true);
      expect(result.items[0]?.name).toBe('Collection 01');
      expect(result.items[1]?.name).toBe('Collection 02');
    });

    it('should handle second page', async () => {
      const result = await queryRepository.findByCreator(curatorId.value, {
        page: 2,
        limit: 2,
        sortBy: CollectionSortField.NAME,
        sortOrder: SortOrder.ASC,
      });

      expect(result.items).toHaveLength(2);
      expect(result.totalCount).toBe(5);
      expect(result.hasMore).toBe(true);
      expect(result.items[0]?.name).toBe('Collection 03');
      expect(result.items[1]?.name).toBe('Collection 04');
    });

    it('should handle last page with remaining items', async () => {
      const result = await queryRepository.findByCreator(curatorId.value, {
        page: 3,
        limit: 2,
        sortBy: CollectionSortField.NAME,
        sortOrder: SortOrder.ASC,
      });

      expect(result.items).toHaveLength(1);
      expect(result.totalCount).toBe(5);
      expect(result.hasMore).toBe(false);
      expect(result.items[0]?.name).toBe('Collection 05');
    });

    it('should handle page beyond available data', async () => {
      const result = await queryRepository.findByCreator(curatorId.value, {
        page: 10,
        limit: 2,
        sortBy: CollectionSortField.NAME,
        sortOrder: SortOrder.ASC,
      });

      expect(result.items).toHaveLength(0);
      expect(result.totalCount).toBe(5);
      expect(result.hasMore).toBe(false);
    });

    it('should handle large limit that exceeds total items', async () => {
      const result = await queryRepository.findByCreator(curatorId.value, {
        page: 1,
        limit: 100,
        sortBy: CollectionSortField.NAME,
        sortOrder: SortOrder.ASC,
      });

      expect(result.items).toHaveLength(5);
      expect(result.totalCount).toBe(5);
      expect(result.hasMore).toBe(false);
    });

    it('should calculate hasMore correctly for exact page boundaries', async () => {
      // Test when items exactly fill pages
      const result = await queryRepository.findByCreator(curatorId.value, {
        page: 1,
        limit: 5, // Exactly matches total count
        sortBy: CollectionSortField.NAME,
        sortOrder: SortOrder.ASC,
      });

      expect(result.items).toHaveLength(5);
      expect(result.totalCount).toBe(5);
      expect(result.hasMore).toBe(false);
    });
  });

  describe('combined sorting and pagination', () => {
    beforeEach(async () => {
      // Create collections with different update times and card counts
      const collections = [
        {
          name: 'Alpha',
          updatedAt: new Date('2023-01-01'),
          cardCount: 3,
        },
        {
          name: 'Beta',
          updatedAt: new Date('2023-01-03'),
          cardCount: 1,
        },
        {
          name: 'Gamma',
          updatedAt: new Date('2023-01-02'),
          cardCount: 2,
        },
        {
          name: 'Delta',
          updatedAt: new Date('2023-01-04'),
          cardCount: 0,
        },
      ];

      for (const collectionData of collections) {
        const collection = Collection.create(
          {
            authorId: curatorId,
            name: collectionData.name,
            accessType: CollectionAccessType.OPEN,
            collaboratorIds: [],
            createdAt: new Date(),
            updatedAt: collectionData.updatedAt,
          },
          new UniqueEntityID(),
        ).unwrap();

        await collectionRepository.create(collection);

        // Add cards to match expected card count
        for (let i = 0; i < collectionData.cardCount; i++) {
          const card = CardFactory.create({
            curatorId: curatorId.value,
            cardInput: {
              type: CardTypeEnum.NOTE,
              text: `Card ${i} for ${collectionData.name}`,
            },
          }).unwrap();

          await cardRepository.save(card);
          collection.addCard(card.cardId, curatorId);
        }

        // Save to process the ADD_CARD commands
        if (collectionData.cardCount > 0) {
          await collectionRepository.save(collection);
        }
      }
    });

    it('should combine sorting by updated date desc with pagination', async () => {
      // First page - should get Delta (newest) and Beta
      const page1 = await queryRepository.findByCreator(curatorId.value, {
        page: 1,
        limit: 2,
        sortBy: CollectionSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
      });

      expect(page1.items).toHaveLength(2);
      expect(page1.items[0]!.updatedAt.getTime()).toBeGreaterThanOrEqual(
        page1.items[1]!.updatedAt.getTime(),
      );
      expect(page1.hasMore).toBe(true);

      // Second page - should get Gamma and Alpha
      const page2 = await queryRepository.findByCreator(curatorId.value, {
        page: 2,
        limit: 2,
        sortBy: CollectionSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
      });

      expect(page2.items).toHaveLength(2);
      expect(page2.items[0]!.updatedAt.getTime()).toBeGreaterThanOrEqual(
        page2.items[1]!.updatedAt.getTime(),
      );
      expect(page2.hasMore).toBe(false);
    });

    it('should combine sorting by card count desc with pagination', async () => {
      // First page - should get Alpha (3 cards) and Gamma (2 cards)
      const page1 = await queryRepository.findByCreator(curatorId.value, {
        page: 1,
        limit: 2,
        sortBy: CollectionSortField.CARD_COUNT,
        sortOrder: SortOrder.DESC,
      });

      expect(page1.items).toHaveLength(2);
      expect(page1.items[0]?.name).toBe('Alpha');
      expect(page1.items[0]?.cardCount).toBe(3);
      expect(page1.items[1]?.name).toBe('Gamma');
      expect(page1.items[1]?.cardCount).toBe(2);
      expect(page1.hasMore).toBe(true);

      // Second page - should get Beta (1 card) and Delta (0 cards)
      const page2 = await queryRepository.findByCreator(curatorId.value, {
        page: 2,
        limit: 2,
        sortBy: CollectionSortField.CARD_COUNT,
        sortOrder: SortOrder.DESC,
      });

      expect(page2.items).toHaveLength(2);
      expect(page2.items[0]?.name).toBe('Beta');
      expect(page2.items[0]?.cardCount).toBe(1);
      expect(page2.items[1]?.name).toBe('Delta');
      expect(page2.items[1]?.cardCount).toBe(0);
      expect(page2.hasMore).toBe(false);
    });
  });

  describe('text search', () => {
    beforeEach(async () => {
      // Create collections with different names and descriptions for search testing
      const collections = [
        {
          name: 'Machine Learning Papers',
          description: 'Collection of AI and ML research papers',
        },
        {
          name: 'Web Development',
          description: 'Frontend and backend development resources',
        },
        {
          name: 'Data Science',
          description: 'Statistics, machine learning, and data analysis',
        },
        {
          name: 'JavaScript Tutorials',
          description: 'Learning resources for JS development',
        },
        {
          name: 'Python Scripts',
          description: 'Useful Python automation and data scripts',
        },
        {
          name: 'No Description Collection',
          description: undefined, // No description
        },
      ];

      for (const collectionData of collections) {
        const collection = Collection.create(
          {
            authorId: curatorId,
            name: collectionData.name,
            description: collectionData.description,
            accessType: CollectionAccessType.OPEN,
            collaboratorIds: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          new UniqueEntityID(),
        ).unwrap();

        await collectionRepository.create(collection);
      }
    });

    it('should return all collections when no search text provided', async () => {
      const result = await queryRepository.findByCreator(curatorId.value, {
        page: 1,
        limit: 10,
        sortBy: CollectionSortField.NAME,
        sortOrder: SortOrder.ASC,
      });

      expect(result.items).toHaveLength(6);
      expect(result.totalCount).toBe(6);
    });

    it('should search by collection name (case insensitive)', async () => {
      const result = await queryRepository.findByCreator(curatorId.value, {
        page: 1,
        limit: 10,
        sortBy: CollectionSortField.NAME,
        sortOrder: SortOrder.ASC,
        searchText: 'MACHINE',
      });

      expect(result.items).toHaveLength(2);
      expect(result.totalCount).toBe(2);
    });

    it('should search by collection description', async () => {
      const result = await queryRepository.findByCreator(curatorId.value, {
        page: 1,
        limit: 10,
        sortBy: CollectionSortField.NAME,
        sortOrder: SortOrder.ASC,
        searchText: 'development',
      });

      expect(result.items).toHaveLength(2);
      expect(result.totalCount).toBe(2);

      const names = result.items.map((item) => item.name).sort();
      expect(names).toEqual(['JavaScript Tutorials', 'Web Development']);
    });

    it('should search across both name and description', async () => {
      const result = await queryRepository.findByCreator(curatorId.value, {
        page: 1,
        limit: 10,
        sortBy: CollectionSortField.NAME,
        sortOrder: SortOrder.ASC,
        searchText: 'python',
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.name).toBe('Python Scripts');
      expect(result.totalCount).toBe(1);
    });

    it('should return multiple matches for broad search terms', async () => {
      const result = await queryRepository.findByCreator(curatorId.value, {
        page: 1,
        limit: 10,
        sortBy: CollectionSortField.NAME,
        sortOrder: SortOrder.ASC,
        searchText: 'learning',
      });

      expect(result.items).toHaveLength(3);
      expect(result.totalCount).toBe(3);
    });

    it('should return empty results for non-matching search', async () => {
      const result = await queryRepository.findByCreator(curatorId.value, {
        page: 1,
        limit: 10,
        sortBy: CollectionSortField.NAME,
        sortOrder: SortOrder.ASC,
        searchText: 'nonexistent',
      });

      expect(result.items).toHaveLength(0);
      expect(result.totalCount).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('should handle empty search text as no filter', async () => {
      const result = await queryRepository.findByCreator(curatorId.value, {
        page: 1,
        limit: 10,
        sortBy: CollectionSortField.NAME,
        sortOrder: SortOrder.ASC,
        searchText: '',
      });

      expect(result.items).toHaveLength(6);
      expect(result.totalCount).toBe(6);
    });

    it('should handle whitespace-only search text as no filter', async () => {
      const result = await queryRepository.findByCreator(curatorId.value, {
        page: 1,
        limit: 10,
        sortBy: CollectionSortField.NAME,
        sortOrder: SortOrder.ASC,
        searchText: '   ',
      });

      expect(result.items).toHaveLength(6);
      expect(result.totalCount).toBe(6);
    });

    it('should combine search with pagination', async () => {
      const result = await queryRepository.findByCreator(curatorId.value, {
        page: 1,
        limit: 1,
        sortBy: CollectionSortField.NAME,
        sortOrder: SortOrder.ASC,
        searchText: 'learning',
      });

      expect(result.items).toHaveLength(1);
      expect(result.totalCount).toBe(3);
      expect(result.hasMore).toBe(true);
    });

    it('should combine search with sorting by name desc', async () => {
      const result = await queryRepository.findByCreator(curatorId.value, {
        page: 1,
        limit: 10,
        sortBy: CollectionSortField.NAME,
        sortOrder: SortOrder.DESC,
        searchText: 'learning',
      });

      expect(result.items).toHaveLength(3);
    });

    it('should search collections with null descriptions', async () => {
      const result = await queryRepository.findByCreator(curatorId.value, {
        page: 1,
        limit: 10,
        sortBy: CollectionSortField.NAME,
        sortOrder: SortOrder.ASC,
        searchText: 'description',
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.name).toBe('No Description Collection');
      expect(result.totalCount).toBe(1);
    });

    it('should handle special characters in search text', async () => {
      // Create a collection with special characters
      const collection = Collection.create(
        {
          authorId: curatorId,
          name: 'C++ Programming',
          description: 'Advanced C++ & system programming',
          accessType: CollectionAccessType.OPEN,
          collaboratorIds: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        new UniqueEntityID(),
      ).unwrap();

      await collectionRepository.create(collection);

      const result = await queryRepository.findByCreator(curatorId.value, {
        page: 1,
        limit: 10,
        sortBy: CollectionSortField.NAME,
        sortOrder: SortOrder.ASC,
        searchText: 'C++',
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.name).toBe('C++ Programming');
    });

    it('should handle partial word matches', async () => {
      const result = await queryRepository.findByCreator(curatorId.value, {
        page: 1,
        limit: 10,
        sortBy: CollectionSortField.NAME,
        sortOrder: SortOrder.ASC,
        searchText: 'script',
      });

      expect(result.items).toHaveLength(3);
      expect(result.totalCount).toBe(3);
    });

    it('should not return collections from other curators in search', async () => {
      // Create collection for other curator
      const otherCollection = Collection.create(
        {
          authorId: otherCuratorId,
          name: 'Other Machine Learning',
          description: 'Another ML collection',
          accessType: CollectionAccessType.OPEN,
          collaboratorIds: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        new UniqueEntityID(),
      ).unwrap();

      await collectionRepository.save(otherCollection);

      const result = await queryRepository.findByCreator(curatorId.value, {
        page: 1,
        limit: 10,
        sortBy: CollectionSortField.NAME,
        sortOrder: SortOrder.ASC,
        searchText: 'machine',
      });

      expect(result.items).toHaveLength(2);
    });
  });

  describe('published record URIs', () => {
    it('should return empty string for collections without published records', async () => {
      const collection = Collection.create(
        {
          authorId: curatorId,
          name: 'Unpublished Collection',
          accessType: CollectionAccessType.OPEN,
          collaboratorIds: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        new UniqueEntityID(),
      ).unwrap();

      await collectionRepository.create(collection);

      const result = await queryRepository.findByCreator(curatorId.value, {
        page: 1,
        limit: 10,
        sortBy: CollectionSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.uri).toBeUndefined();
    });

    it('should return URI for collections with published records', async () => {
      const testUri =
        'at://did:plc:testcurator/network.cosmik.collection/test123';
      const testCid = 'bafytest123';

      // Create collection using builder
      const collection = new CollectionBuilder()
        .withAuthorId(curatorId.value)
        .withName('Published Collection')
        .withAccessType(CollectionAccessType.OPEN)
        .buildOrThrow();

      // Publish the collection using the fake publisher
      const publishResult = await fakePublisher.publish(collection);
      expect(publishResult.isOk()).toBe(true);

      const publishedRecordId = publishResult.unwrap();

      // Mark the collection as published in the domain model
      collection.markAsPublished(publishedRecordId);

      // Save the collection
      await collectionRepository.create(collection);

      const result = await queryRepository.findByCreator(curatorId.value, {
        page: 1,
        limit: 10,
        sortBy: CollectionSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.uri).toBe(publishedRecordId.uri);
      expect(result.items[0]?.name).toBe('Published Collection');
    });

    it('should handle mix of published and unpublished collections', async () => {
      // Create published collection using builder
      const publishedCollection = new CollectionBuilder()
        .withAuthorId(curatorId.value)
        .withName('Published Collection')
        .withAccessType(CollectionAccessType.OPEN)
        .withCreatedAt(new Date('2023-01-01'))
        .withUpdatedAt(new Date('2023-01-01'))
        .buildOrThrow();

      // Create unpublished collection using builder
      const unpublishedCollection = new CollectionBuilder()
        .withAuthorId(curatorId.value)
        .withName('Unpublished Collection')
        .withAccessType(CollectionAccessType.OPEN)
        .withCreatedAt(new Date('2023-01-02'))
        .withUpdatedAt(new Date('2023-01-02'))
        .buildOrThrow();

      // Publish the first collection using the fake publisher
      const publishResult = await fakePublisher.publish(publishedCollection);
      expect(publishResult.isOk()).toBe(true);

      const publishedRecordId = publishResult.unwrap();

      // Mark the collection as published in the domain model
      publishedCollection.markAsPublished(publishedRecordId);

      // Create both collections
      await collectionRepository.create(publishedCollection);
      await collectionRepository.create(unpublishedCollection);

      const result = await queryRepository.findByCreator(curatorId.value, {
        page: 1,
        limit: 10,
        sortBy: CollectionSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
      });

      expect(result.items).toHaveLength(2);

      // Find collections by name and check URIs
      const publishedItem = result.items.find(
        (item) => item.name === 'Published Collection',
      );
      const unpublishedItem = result.items.find(
        (item) => item.name === 'Unpublished Collection',
      );

      expect(publishedItem?.uri).toBe(publishedRecordId.uri);
      expect(unpublishedItem?.uri).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should handle curator with no collections gracefully', async () => {
      const result = await queryRepository.findByCreator(
        'did:plc:nonexistent',
        {
          page: 1,
          limit: 10,
          sortBy: CollectionSortField.UPDATED_AT,
          sortOrder: SortOrder.DESC,
        },
      );

      expect(result.items).toHaveLength(0);
      expect(result.totalCount).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('should handle collections with null descriptions', async () => {
      const collection = Collection.create(
        {
          authorId: curatorId,
          name: 'No Description Collection',
          // No description provided
          accessType: CollectionAccessType.OPEN,
          collaboratorIds: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        new UniqueEntityID(),
      ).unwrap();

      await collectionRepository.create(collection);

      const result = await queryRepository.findByCreator(curatorId.value, {
        page: 1,
        limit: 10,
        sortBy: CollectionSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.description).toBeUndefined();
    });

    it('should handle very large page numbers', async () => {
      const collection = Collection.create(
        {
          authorId: curatorId,
          name: 'Single Collection',
          accessType: CollectionAccessType.OPEN,
          collaboratorIds: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        new UniqueEntityID(),
      ).unwrap();

      await collectionRepository.create(collection);

      const result = await queryRepository.findByCreator(curatorId.value, {
        page: 999999,
        limit: 10,
        sortBy: CollectionSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
      });

      expect(result.items).toHaveLength(0);
      expect(result.totalCount).toBe(1);
      expect(result.hasMore).toBe(false);
    });
  });
});
