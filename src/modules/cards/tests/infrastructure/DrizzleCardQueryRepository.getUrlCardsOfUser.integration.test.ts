import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import postgres from 'postgres';
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DrizzleCardQueryRepository } from '../../infrastructure/repositories/DrizzleCardQueryRepository';
import { DrizzleCardRepository } from '../../infrastructure/repositories/DrizzleCardRepository';
import { DrizzleCollectionRepository } from '../../infrastructure/repositories/DrizzleCollectionRepository';
import { CuratorId } from '../../domain/value-objects/CuratorId';
import { UniqueEntityID } from '../../../../shared/domain/UniqueEntityID';
import { cards } from '../../infrastructure/repositories/schema/card.sql';
import {
  collections,
  collectionCards,
} from '../../infrastructure/repositories/schema/collection.sql';
import { libraryMemberships } from '../../infrastructure/repositories/schema/libraryMembership.sql';
import { publishedRecords } from '../../infrastructure/repositories/schema/publishedRecord.sql';
import { Collection, CollectionAccessType } from '../../domain/Collection';
import { CardBuilder } from '../utils/builders/CardBuilder';
import { URL } from '../../domain/value-objects/URL';
import { UrlMetadata } from '../../domain/value-objects/UrlMetadata';
import { CardSortField, SortOrder } from '../../domain/ICardQueryRepository';
import { createTestSchema } from '../test-utils/createTestSchema';
import { CardTypeEnum } from '../../domain/value-objects/CardType';
import { UrlType } from '../../domain/value-objects/UrlType';

describe('DrizzleCardQueryRepository - getUrlCardsOfUser', () => {
  let container: StartedPostgreSqlContainer;
  let db: PostgresJsDatabase;
  let queryRepository: DrizzleCardQueryRepository;
  let cardRepository: DrizzleCardRepository;
  let collectionRepository: DrizzleCollectionRepository;

  // Test data
  let curatorId: CuratorId;
  let otherCuratorId: CuratorId;
  let thirdCuratorId: CuratorId;

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
    queryRepository = new DrizzleCardQueryRepository(db);
    cardRepository = new DrizzleCardRepository(db);
    collectionRepository = new DrizzleCollectionRepository(db);

    // Create schema using helper function
    await createTestSchema(db);

    // Create test data
    curatorId = CuratorId.create('did:plc:testcurator').unwrap();
    otherCuratorId = CuratorId.create('did:plc:othercurator').unwrap();
    thirdCuratorId = CuratorId.create('did:plc:thirdcurator').unwrap();
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

  describe('getUrlCardsOfUser', () => {
    it('should return empty result when user has no URL cards', async () => {
      const result = await queryRepository.getUrlCardsOfUser(curatorId.value, {
        page: 1,
        limit: 10,
        sortBy: CardSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
      });

      expect(result.items).toHaveLength(0);
      expect(result.totalCount).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('should return URL cards for a user', async () => {
      // Create URL cards
      const url1 = URL.create('https://example.com/article1').unwrap();
      const urlMetadata1 = UrlMetadata.create({
        url: url1.value,
        title: 'Example Article 1',
        description: 'A great article about testing',
        author: 'John Doe',
        imageUrl: 'https://example.com/image1.jpg',
      }).unwrap();

      const urlCard1 = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withUrlCard(url1, urlMetadata1)
        .withCreatedAt(new Date('2023-01-01'))
        .withUpdatedAt(new Date('2023-01-01'))
        .buildOrThrow();

      const url2 = URL.create('https://example.com/article2').unwrap();
      const urlCard2 = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withUrlCard(url2)
        .withCreatedAt(new Date('2023-01-02'))
        .withUpdatedAt(new Date('2023-01-02'))
        .buildOrThrow();

      // Save cards
      await cardRepository.save(urlCard1);
      await cardRepository.save(urlCard2);

      // Add cards to user's library using domain logic
      urlCard1.addToLibrary(curatorId);
      urlCard2.addToLibrary(curatorId);

      // Save the updated cards
      await cardRepository.save(urlCard1);
      await cardRepository.save(urlCard2);

      // Query URL cards
      const result = await queryRepository.getUrlCardsOfUser(curatorId.value, {
        page: 1,
        limit: 10,
        sortBy: CardSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
      });

      expect(result.items).toHaveLength(2);
      expect(result.totalCount).toBe(2);
      expect(result.hasMore).toBe(false);

      // Check URL card data
      const card1Result = result.items.find((item) => item.url === url1.value);
      const card2Result = result.items.find((item) => item.url === url2.value);

      expect(card1Result).toBeDefined();
      expect(card1Result?.type).toBe(CardTypeEnum.URL);
      expect(card1Result?.cardContent.title).toBe('Example Article 1');
      expect(card1Result?.cardContent.description).toBe(
        'A great article about testing',
      );
      expect(card1Result?.cardContent.author).toBe('John Doe');
      expect(card1Result?.cardContent.imageUrl).toBe(
        'https://example.com/image1.jpg',
      );

      expect(card2Result).toBeDefined();
      expect(card2Result?.type).toBe(CardTypeEnum.URL);
      expect(card2Result?.cardContent.title).toBeUndefined(); // No metadata provided
    });

    it('should include connected note cards', async () => {
      // Create URL card
      const url = URL.create('https://example.com/article').unwrap();
      const urlCard = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withUrlCard(url)
        .buildOrThrow();

      await cardRepository.save(urlCard);

      // Create note card connected to URL card
      const noteCard = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withNoteCard('This is my note about the article')
        .withParentCard(urlCard.cardId)
        .buildOrThrow();

      await cardRepository.save(noteCard);

      // Add both cards to user's library using domain logic
      urlCard.addToLibrary(curatorId);
      noteCard.addToLibrary(curatorId);

      // Save the updated cards
      await cardRepository.save(urlCard);
      await cardRepository.save(noteCard);

      // Query URL cards
      const result = await queryRepository.getUrlCardsOfUser(curatorId.value, {
        page: 1,
        limit: 10,
        sortBy: CardSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
      });

      expect(result.items).toHaveLength(1);
      const urlCardResult = result.items[0];

      expect(urlCardResult?.note).toBeDefined();
      expect(urlCardResult?.note?.id).toBe(noteCard.cardId.getStringValue());
      expect(urlCardResult?.note?.text).toBe(
        'This is my note about the article',
      );
    });

    it('should include collections that contain the URL cards', async () => {
      // Create URL card
      const url = URL.create('https://example.com/article').unwrap();
      const urlCard = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withUrlCard(url)
        .buildOrThrow();

      await cardRepository.save(urlCard);

      // Create collections
      const collection1 = Collection.create(
        {
          authorId: curatorId,
          name: 'Reading List',
          description: 'Articles to read',
          accessType: CollectionAccessType.OPEN,
          collaboratorIds: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        new UniqueEntityID(),
      ).unwrap();

      const collection2 = Collection.create(
        {
          authorId: curatorId,
          name: 'Favorites',
          accessType: CollectionAccessType.OPEN,
          collaboratorIds: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        new UniqueEntityID(),
      ).unwrap();

      // Add card to collections
      collection1.addCard(urlCard.cardId, curatorId);
      collection2.addCard(urlCard.cardId, curatorId);

      await collectionRepository.save(collection1);
      await collectionRepository.save(collection2);

      // Add card to user's library using domain logic
      urlCard.addToLibrary(curatorId);

      // Save the updated card
      await cardRepository.save(urlCard);

      // Query URL cards
      const result = await queryRepository.getUrlCardsOfUser(curatorId.value, {
        page: 1,
        limit: 10,
        sortBy: CardSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
      });

      expect(result.items).toHaveLength(1);
      const urlCardResult = result.items[0];

      expect(urlCardResult?.collections).toHaveLength(2);

      const collectionNames = urlCardResult?.collections
        .map((c) => c.name)
        .sort();
      expect(collectionNames).toEqual(['Favorites', 'Reading List']);

      // Check collection details
      const readingListCollection = urlCardResult?.collections.find(
        (c) => c.name === 'Reading List',
      );
      expect(readingListCollection?.authorId).toBe(curatorId.value);
      expect(readingListCollection?.id).toBe(
        collection1.collectionId.getStringValue(),
      );
    });

    it('should only return URL cards in the specified user library', async () => {
      // Create URL card for first user
      const url1 = URL.create('https://example.com/user1-article').unwrap();
      const urlCard1 = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withUrlCard(url1)
        .buildOrThrow();

      await cardRepository.save(urlCard1);

      // Create URL card for second user
      const url2 = URL.create('https://example.com/user2-article').unwrap();
      const urlCard2 = new CardBuilder()
        .withCuratorId(otherCuratorId.value)
        .withUrlCard(url2)
        .buildOrThrow();

      await cardRepository.save(urlCard2);

      // Add cards to their respective creator's libraries
      urlCard1.addToLibrary(curatorId);
      await cardRepository.save(urlCard1);

      urlCard2.addToLibrary(otherCuratorId);
      await cardRepository.save(urlCard2);

      // Query URL cards for first user
      const result1 = await queryRepository.getUrlCardsOfUser(curatorId.value, {
        page: 1,
        limit: 10,
        sortBy: CardSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
      });

      // Query URL cards for second user
      const result2 = await queryRepository.getUrlCardsOfUser(
        otherCuratorId.value,
        {
          page: 1,
          limit: 10,
          sortBy: CardSortField.UPDATED_AT,
          sortOrder: SortOrder.DESC,
        },
      );

      // Each user should only see their own URL card
      expect(result1.items).toHaveLength(1);
      expect(result1.items[0]?.url).toBe(url1.value);

      expect(result2.items).toHaveLength(1);
      expect(result2.items[0]?.url).toBe(url2.value);
    });

    it("should not return URL cards from other users' libraries", async () => {
      // Create URL card for other user
      const url = URL.create('https://example.com/private-article').unwrap();
      const urlCard = new CardBuilder()
        .withCuratorId(otherCuratorId.value)
        .withUrlCard(url)
        .buildOrThrow();

      await cardRepository.save(urlCard);

      // Add card only to other user's library using domain logic
      urlCard.addToLibrary(otherCuratorId);

      // Save the updated card
      await cardRepository.save(urlCard);

      // Query URL cards for our user
      const result = await queryRepository.getUrlCardsOfUser(curatorId.value, {
        page: 1,
        limit: 10,
        sortBy: CardSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
      });

      expect(result.items).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });

    it('should not return note cards that are not connected to URL cards', async () => {
      // Create standalone note card
      const noteCard = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withNoteCard('Standalone note')
        .buildOrThrow();

      await cardRepository.save(noteCard);

      // Add note card to user's library using domain logic
      noteCard.addToLibrary(curatorId);

      // Save the updated card
      await cardRepository.save(noteCard);

      // Query URL cards
      const result = await queryRepository.getUrlCardsOfUser(curatorId.value, {
        page: 1,
        limit: 10,
        sortBy: CardSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
      });

      // Should not return the note card since it's not a URL card
      expect(result.items).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });

    it('should handle complex scenario with URL card, note, and multiple collections', async () => {
      // Create URL card with metadata
      const url = URL.create('https://example.com/complex-article').unwrap();
      const urlMetadata = UrlMetadata.create({
        url: url.value,
        title: 'Complex Article',
        description: 'An article with notes and collections',
        author: 'Jane Smith',
        imageUrl: 'https://example.com/complex.jpg',
        siteName: 'Example Site',
      }).unwrap();

      const urlCard = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withUrlCard(url, urlMetadata)
        .buildOrThrow();

      await cardRepository.save(urlCard);

      // Create connected note
      const noteCard = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withNoteCard('Detailed analysis of the complex article')
        .withParentCard(urlCard.cardId)
        .buildOrThrow();

      await cardRepository.save(noteCard);

      // Create multiple collections
      const workCollection = Collection.create(
        {
          authorId: curatorId,
          name: 'Work Research',
          description: 'Articles for work projects',
          accessType: CollectionAccessType.CLOSED,
          collaboratorIds: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        new UniqueEntityID(),
      ).unwrap();

      const personalCollection = Collection.create(
        {
          authorId: curatorId,
          name: 'Personal Reading',
          accessType: CollectionAccessType.OPEN,
          collaboratorIds: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        new UniqueEntityID(),
      ).unwrap();

      // Add URL card to collections
      workCollection.addCard(urlCard.cardId, curatorId);
      personalCollection.addCard(urlCard.cardId, curatorId);

      await collectionRepository.save(workCollection);
      await collectionRepository.save(personalCollection);

      // Add both cards to user's library - URL cards can only be in creator's library
      urlCard.addToLibrary(curatorId);
      await cardRepository.save(urlCard);

      noteCard.addToLibrary(curatorId);
      await cardRepository.save(noteCard);

      // Query URL cards
      const result = await queryRepository.getUrlCardsOfUser(curatorId.value, {
        page: 1,
        limit: 10,
        sortBy: CardSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
      });

      expect(result.items).toHaveLength(1);
      const urlCardResult = result.items[0];

      // Check URL metadata
      expect(urlCardResult?.url).toBe(url.value);
      expect(urlCardResult?.type).toBe(CardTypeEnum.URL);
      expect(urlCardResult?.cardContent.title).toBe('Complex Article');
      expect(urlCardResult?.cardContent.description).toBe(
        'An article with notes and collections',
      );
      expect(urlCardResult?.cardContent.author).toBe('Jane Smith');
      expect(urlCardResult?.cardContent.imageUrl).toBe(
        'https://example.com/complex.jpg',
      );

      // Check library count - URL cards can only be in one library (creator's)
      expect(urlCardResult?.libraryCount).toBe(1);

      // Check connected note
      expect(urlCardResult?.note).toBeDefined();
      expect(urlCardResult?.note?.id).toBe(noteCard.cardId.getStringValue());
      expect(urlCardResult?.note?.text).toBe(
        'Detailed analysis of the complex article',
      );

      // Check collections
      expect(urlCardResult?.collections).toHaveLength(2);
      const collectionNames = urlCardResult?.collections
        .map((c) => c.name)
        .sort();
      expect(collectionNames).toEqual(['Personal Reading', 'Work Research']);

      // Verify collection details
      const workColl = urlCardResult?.collections.find(
        (c) => c.name === 'Work Research',
      );
      expect(workColl?.authorId).toBe(curatorId.value);
      expect(workColl?.id).toBe(workCollection.collectionId.getStringValue());
    });
  });

  describe('sorting', () => {
    beforeEach(async () => {
      // Create URL cards with different properties for sorting
      // Each URL card is created by and belongs to curatorId
      const urls = [
        {
          url: 'https://example.com/alpha',
          date: '2023-01-01',
        },
        {
          url: 'https://example.com/beta',
          date: '2023-01-03',
        },
        {
          url: 'https://example.com/gamma',
          date: '2023-01-02',
        },
      ];

      for (const urlData of urls) {
        const url = URL.create(urlData.url).unwrap();
        const urlCard = new CardBuilder()
          .withCuratorId(curatorId.value)
          .withUrlCard(url)
          .withCreatedAt(new Date(urlData.date))
          .withUpdatedAt(new Date(urlData.date))
          .buildOrThrow();

        await cardRepository.save(urlCard);

        // Add to library using domain logic - URL cards can only be in creator's library
        urlCard.addToLibrary(curatorId);
        await cardRepository.save(urlCard);
      }
    });

    it('should sort by library count descending', async () => {
      const result = await queryRepository.getUrlCardsOfUser(curatorId.value, {
        page: 1,
        limit: 10,
        sortBy: CardSortField.LIBRARY_COUNT,
        sortOrder: SortOrder.DESC,
      });

      expect(result.items).toHaveLength(3);
      // All URL cards have library count of 1 (only in creator's library)
      expect(result.items[0]?.libraryCount).toBe(1);
      expect(result.items[1]?.libraryCount).toBe(1);
      expect(result.items[2]?.libraryCount).toBe(1);
    });

    it('should sort by library count ascending', async () => {
      const result = await queryRepository.getUrlCardsOfUser(curatorId.value, {
        page: 1,
        limit: 10,
        sortBy: CardSortField.LIBRARY_COUNT,
        sortOrder: SortOrder.ASC,
      });

      expect(result.items).toHaveLength(3);
      // All URL cards have library count of 1 (only in creator's library)
      expect(result.items[0]?.libraryCount).toBe(1);
      expect(result.items[1]?.libraryCount).toBe(1);
      expect(result.items[2]?.libraryCount).toBe(1);
    });

    it('should sort by updated date descending', async () => {
      const result = await queryRepository.getUrlCardsOfUser(curatorId.value, {
        page: 1,
        limit: 10,
        sortBy: CardSortField.UPDATED_AT,
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
  });

  describe('urlLibraryCount', () => {
    it('should return urlLibraryCount of 1 when only one user has the URL', async () => {
      const url = URL.create('https://example.com/unique-article').unwrap();
      const urlCard = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withUrlCard(url)
        .buildOrThrow();

      await cardRepository.save(urlCard);
      urlCard.addToLibrary(curatorId);
      await cardRepository.save(urlCard);

      const result = await queryRepository.getUrlCardsOfUser(curatorId.value, {
        page: 1,
        limit: 10,
        sortBy: CardSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.libraryCount).toBe(1);
      expect(result.items[0]?.urlLibraryCount).toBe(1);
    });

    it('should return urlLibraryCount of 3 when three users have cards with the same URL', async () => {
      const sharedUrl = 'https://example.com/popular-article';
      const url = URL.create(sharedUrl).unwrap();

      // Create URL card for first user
      const urlCard1 = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withUrlCard(url)
        .buildOrThrow();

      await cardRepository.save(urlCard1);
      urlCard1.addToLibrary(curatorId);
      await cardRepository.save(urlCard1);

      // Create URL card for second user (same URL)
      const urlCard2 = new CardBuilder()
        .withCuratorId(otherCuratorId.value)
        .withUrlCard(url)
        .buildOrThrow();

      await cardRepository.save(urlCard2);
      urlCard2.addToLibrary(otherCuratorId);
      await cardRepository.save(urlCard2);

      // Create URL card for third user (same URL)
      const urlCard3 = new CardBuilder()
        .withCuratorId(thirdCuratorId.value)
        .withUrlCard(url)
        .buildOrThrow();

      await cardRepository.save(urlCard3);
      urlCard3.addToLibrary(thirdCuratorId);
      await cardRepository.save(urlCard3);

      // Query from first user's perspective
      const result = await queryRepository.getUrlCardsOfUser(curatorId.value, {
        page: 1,
        limit: 10,
        sortBy: CardSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.url).toBe(sharedUrl);
      expect(result.items[0]?.libraryCount).toBe(1); // Only in curator's library
      expect(result.items[0]?.urlLibraryCount).toBe(3); // 3 users have this URL
    });

    it('should return different urlLibraryCounts for different URLs', async () => {
      // URL 1: only curator has it
      const url1 = URL.create('https://example.com/article1').unwrap();
      const urlCard1 = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withUrlCard(url1)
        .withCreatedAt(new Date('2023-01-01'))
        .withUpdatedAt(new Date('2023-01-01'))
        .buildOrThrow();

      await cardRepository.save(urlCard1);
      urlCard1.addToLibrary(curatorId);
      await cardRepository.save(urlCard1);

      // URL 2: curator and otherCurator have it
      const url2 = URL.create('https://example.com/article2').unwrap();
      const urlCard2a = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withUrlCard(url2)
        .withCreatedAt(new Date('2023-01-02'))
        .withUpdatedAt(new Date('2023-01-02'))
        .buildOrThrow();

      await cardRepository.save(urlCard2a);
      urlCard2a.addToLibrary(curatorId);
      await cardRepository.save(urlCard2a);

      const urlCard2b = new CardBuilder()
        .withCuratorId(otherCuratorId.value)
        .withUrlCard(url2)
        .buildOrThrow();

      await cardRepository.save(urlCard2b);
      urlCard2b.addToLibrary(otherCuratorId);
      await cardRepository.save(urlCard2b);

      // Query from curator's perspective
      const result = await queryRepository.getUrlCardsOfUser(curatorId.value, {
        page: 1,
        limit: 10,
        sortBy: CardSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
      });

      expect(result.items).toHaveLength(2);

      const card1 = result.items.find((item) => item.url === url1.value);
      const card2 = result.items.find((item) => item.url === url2.value);

      expect(card1?.libraryCount).toBe(1);
      expect(card1?.urlLibraryCount).toBe(1);

      expect(card2?.libraryCount).toBe(1);
      expect(card2?.urlLibraryCount).toBe(2);
    });

    it('should handle urlLibraryCount with multiple cards per user for same URL', async () => {
      const sharedUrl = 'https://example.com/shared-article';
      const url = URL.create(sharedUrl).unwrap();

      // First user creates a card with this URL
      const urlCard1 = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withUrlCard(url)
        .buildOrThrow();

      await cardRepository.save(urlCard1);
      urlCard1.addToLibrary(curatorId);
      await cardRepository.save(urlCard1);

      // Second user creates TWO cards with the same URL (edge case)
      const urlCard2a = new CardBuilder()
        .withCuratorId(otherCuratorId.value)
        .withUrlCard(url)
        .buildOrThrow();

      await cardRepository.save(urlCard2a);
      urlCard2a.addToLibrary(otherCuratorId);
      await cardRepository.save(urlCard2a);

      const urlCard2b = new CardBuilder()
        .withCuratorId(otherCuratorId.value)
        .withUrlCard(url)
        .buildOrThrow();

      await cardRepository.save(urlCard2b);
      urlCard2b.addToLibrary(otherCuratorId);
      await cardRepository.save(urlCard2b);

      // Query from first user's perspective
      const result = await queryRepository.getUrlCardsOfUser(curatorId.value, {
        page: 1,
        limit: 10,
        sortBy: CardSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.libraryCount).toBe(1); // Only in first user's library
      expect(result.items[0]?.urlLibraryCount).toBe(2); // 2 unique users have this URL
    });
  });

  describe('pagination', () => {
    beforeEach(async () => {
      // Create 5 URL cards for pagination testing
      for (let i = 1; i <= 5; i++) {
        const url = URL.create(`https://example.com/article${i}`).unwrap();
        const urlCard = new CardBuilder()
          .withCuratorId(curatorId.value)
          .withUrlCard(url)
          .withCreatedAt(new Date(`2023-01-${i.toString().padStart(2, '0')}`))
          .withUpdatedAt(new Date(`2023-01-${i.toString().padStart(2, '0')}`))
          .buildOrThrow();

        await cardRepository.save(urlCard);

        // Add to library using domain logic
        urlCard.addToLibrary(curatorId);

        await cardRepository.save(urlCard);
      }
    });

    it('should handle pagination correctly', async () => {
      // First page
      const page1 = await queryRepository.getUrlCardsOfUser(curatorId.value, {
        page: 1,
        limit: 2,
        sortBy: CardSortField.UPDATED_AT,
        sortOrder: SortOrder.ASC,
      });

      expect(page1.items).toHaveLength(2);
      expect(page1.totalCount).toBe(5);
      expect(page1.hasMore).toBe(true);

      // Second page
      const page2 = await queryRepository.getUrlCardsOfUser(curatorId.value, {
        page: 2,
        limit: 2,
        sortBy: CardSortField.UPDATED_AT,
        sortOrder: SortOrder.ASC,
      });

      expect(page2.items).toHaveLength(2);
      expect(page2.totalCount).toBe(5);
      expect(page2.hasMore).toBe(true);

      // Third page (last page with 1 item)
      const page3 = await queryRepository.getUrlCardsOfUser(curatorId.value, {
        page: 3,
        limit: 2,
        sortBy: CardSortField.UPDATED_AT,
        sortOrder: SortOrder.ASC,
      });

      expect(page3.items).toHaveLength(1);
      expect(page3.totalCount).toBe(5);
      expect(page3.hasMore).toBe(false);
    });
  });

  describe('urlInLibrary', () => {
    it('should return urlInLibrary as undefined when callingUserId is not provided', async () => {
      const url = URL.create('https://example.com/test-article').unwrap();
      const urlCard = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withUrlCard(url)
        .buildOrThrow();

      await cardRepository.save(urlCard);
      urlCard.addToLibrary(curatorId);
      await cardRepository.save(urlCard);

      // Query without callingUserId
      const result = await queryRepository.getUrlCardsOfUser(curatorId.value, {
        page: 1,
        limit: 10,
        sortBy: CardSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.urlInLibrary).toBeUndefined();
    });

    it('should return urlInLibrary as true when callingUserId has the URL in their library', async () => {
      const sharedUrl = 'https://example.com/shared-article';
      const url = URL.create(sharedUrl).unwrap();

      // Create URL card for first user
      const urlCard1 = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withUrlCard(url)
        .buildOrThrow();

      await cardRepository.save(urlCard1);
      urlCard1.addToLibrary(curatorId);
      await cardRepository.save(urlCard1);

      // Create URL card for second user with the same URL
      const urlCard2 = new CardBuilder()
        .withCuratorId(otherCuratorId.value)
        .withUrlCard(url)
        .buildOrThrow();

      await cardRepository.save(urlCard2);
      urlCard2.addToLibrary(otherCuratorId);
      await cardRepository.save(urlCard2);

      // Query first user's cards with second user as callingUserId
      const result = await queryRepository.getUrlCardsOfUser(
        curatorId.value,
        {
          page: 1,
          limit: 10,
          sortBy: CardSortField.UPDATED_AT,
          sortOrder: SortOrder.DESC,
        },
        otherCuratorId.value, // callingUserId
      );

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.url).toBe(sharedUrl);
      expect(result.items[0]?.urlInLibrary).toBe(true); // otherCurator has this URL
    });

    it('should return urlInLibrary as false when callingUserId does not have the URL in their library', async () => {
      const url = URL.create('https://example.com/unique-article').unwrap();

      // Create URL card for first user
      const urlCard = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withUrlCard(url)
        .buildOrThrow();

      await cardRepository.save(urlCard);
      urlCard.addToLibrary(curatorId);
      await cardRepository.save(urlCard);

      // Query first user's cards with second user as callingUserId (who doesn't have this URL)
      const result = await queryRepository.getUrlCardsOfUser(
        curatorId.value,
        {
          page: 1,
          limit: 10,
          sortBy: CardSortField.UPDATED_AT,
          sortOrder: SortOrder.DESC,
        },
        otherCuratorId.value, // callingUserId who doesn't have this URL
      );

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.urlInLibrary).toBe(false); // otherCurator doesn't have this URL
    });

    it('should return urlInLibrary as true when the card author is the same as callingUserId', async () => {
      const url = URL.create('https://example.com/my-article').unwrap();

      // Create URL card for curator
      const urlCard = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withUrlCard(url)
        .buildOrThrow();

      await cardRepository.save(urlCard);
      urlCard.addToLibrary(curatorId);
      await cardRepository.save(urlCard);

      // Query with the same user as callingUserId
      const result = await queryRepository.getUrlCardsOfUser(
        curatorId.value,
        {
          page: 1,
          limit: 10,
          sortBy: CardSortField.UPDATED_AT,
          sortOrder: SortOrder.DESC,
        },
        curatorId.value, // same as card author
      );

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.urlInLibrary).toBe(true); // curator has their own URL
    });

    it('should return urlInLibrary correctly when user has multiple cards with the same URL', async () => {
      const sharedUrl = 'https://example.com/multi-card-url';
      const url = URL.create(sharedUrl).unwrap();

      // Create first URL card for curator
      const urlCard1 = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withUrlCard(url)
        .buildOrThrow();

      await cardRepository.save(urlCard1);
      urlCard1.addToLibrary(curatorId);
      await cardRepository.save(urlCard1);

      // Create URL card for otherCurator with the same URL (multiple cards)
      const urlCard2a = new CardBuilder()
        .withCuratorId(otherCuratorId.value)
        .withUrlCard(url)
        .buildOrThrow();

      await cardRepository.save(urlCard2a);
      urlCard2a.addToLibrary(otherCuratorId);
      await cardRepository.save(urlCard2a);

      // Create ANOTHER URL card for otherCurator with the same URL
      const urlCard2b = new CardBuilder()
        .withCuratorId(otherCuratorId.value)
        .withUrlCard(url)
        .buildOrThrow();

      await cardRepository.save(urlCard2b);
      urlCard2b.addToLibrary(otherCuratorId);
      await cardRepository.save(urlCard2b);

      // Query first user's cards with second user as callingUserId
      const result = await queryRepository.getUrlCardsOfUser(
        curatorId.value,
        {
          page: 1,
          limit: 10,
          sortBy: CardSortField.UPDATED_AT,
          sortOrder: SortOrder.DESC,
        },
        otherCuratorId.value, // callingUserId who has multiple cards with this URL
      );

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.url).toBe(sharedUrl);
      expect(result.items[0]?.urlInLibrary).toBe(true); // otherCurator has this URL (even with multiple cards)
    });

    it('should handle multiple URLs with different urlInLibrary values', async () => {
      // URL 1: curator has it, otherCurator also has it
      const url1 = URL.create('https://example.com/shared-url').unwrap();
      const urlCard1a = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withUrlCard(url1)
        .withCreatedAt(new Date('2023-01-01'))
        .withUpdatedAt(new Date('2023-01-01'))
        .buildOrThrow();

      await cardRepository.save(urlCard1a);
      urlCard1a.addToLibrary(curatorId);
      await cardRepository.save(urlCard1a);

      const urlCard1b = new CardBuilder()
        .withCuratorId(otherCuratorId.value)
        .withUrlCard(url1)
        .buildOrThrow();

      await cardRepository.save(urlCard1b);
      urlCard1b.addToLibrary(otherCuratorId);
      await cardRepository.save(urlCard1b);

      // URL 2: curator has it, otherCurator does NOT have it
      const url2 = URL.create('https://example.com/unique-url').unwrap();
      const urlCard2 = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withUrlCard(url2)
        .withCreatedAt(new Date('2023-01-02'))
        .withUpdatedAt(new Date('2023-01-02'))
        .buildOrThrow();

      await cardRepository.save(urlCard2);
      urlCard2.addToLibrary(curatorId);
      await cardRepository.save(urlCard2);

      // Query curator's cards with otherCurator as callingUserId
      const result = await queryRepository.getUrlCardsOfUser(
        curatorId.value,
        {
          page: 1,
          limit: 10,
          sortBy: CardSortField.UPDATED_AT,
          sortOrder: SortOrder.DESC,
        },
        otherCuratorId.value,
      );

      expect(result.items).toHaveLength(2);

      const card1 = result.items.find((item) => item.url === url1.value);
      const card2 = result.items.find((item) => item.url === url2.value);

      expect(card1?.urlInLibrary).toBe(true); // otherCurator has this URL
      expect(card2?.urlInLibrary).toBe(false); // otherCurator doesn't have this URL
    });

    it('should correctly handle urlInLibrary with third user checking two other users URLs', async () => {
      const sharedUrl = 'https://example.com/popular-url';
      const url = URL.create(sharedUrl).unwrap();

      // First user creates card with this URL
      const urlCard1 = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withUrlCard(url)
        .buildOrThrow();

      await cardRepository.save(urlCard1);
      urlCard1.addToLibrary(curatorId);
      await cardRepository.save(urlCard1);

      // Second user creates card with the same URL
      const urlCard2 = new CardBuilder()
        .withCuratorId(otherCuratorId.value)
        .withUrlCard(url)
        .buildOrThrow();

      await cardRepository.save(urlCard2);
      urlCard2.addToLibrary(otherCuratorId);
      await cardRepository.save(urlCard2);

      // Query first user's cards with third user as callingUserId (who doesn't have this URL)
      const result = await queryRepository.getUrlCardsOfUser(
        curatorId.value,
        {
          page: 1,
          limit: 10,
          sortBy: CardSortField.UPDATED_AT,
          sortOrder: SortOrder.DESC,
        },
        thirdCuratorId.value, // third user checking
      );

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.url).toBe(sharedUrl);
      expect(result.items[0]?.urlInLibrary).toBe(false); // thirdCurator doesn't have this URL
      expect(result.items[0]?.urlLibraryCount).toBe(2); // But 2 users have it
    });
  });

  describe('URL type filtering', () => {
    it('should filter URL cards by urlType', async () => {
      // Create URL cards with different types
      const articleUrl = URL.create('https://example.com/article').unwrap();
      const articleMetadata = UrlMetadata.create({
        url: articleUrl.value,
        title: 'Test Article',
        type: UrlType.ARTICLE,
      }).unwrap();

      const videoUrl = URL.create('https://example.com/video').unwrap();
      const videoMetadata = UrlMetadata.create({
        url: videoUrl.value,
        title: 'Test Video',
        type: UrlType.VIDEO,
      }).unwrap();

      const articleCard = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withUrlCard(articleUrl, articleMetadata)
        .buildOrThrow();

      const videoCard = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withUrlCard(videoUrl, videoMetadata)
        .buildOrThrow();

      await cardRepository.save(articleCard);
      await cardRepository.save(videoCard);

      articleCard.addToLibrary(curatorId);
      videoCard.addToLibrary(curatorId);

      await cardRepository.save(articleCard);
      await cardRepository.save(videoCard);

      // Query for only article type
      const articleResult = await queryRepository.getUrlCardsOfUser(
        curatorId.value,
        {
          page: 1,
          limit: 10,
          sortBy: CardSortField.UPDATED_AT,
          sortOrder: SortOrder.DESC,
          urlType: UrlType.ARTICLE,
        },
      );

      expect(articleResult.items).toHaveLength(1);
      expect(articleResult.items[0]?.url).toBe(articleUrl.value);

      // Query for only video type
      const videoResult = await queryRepository.getUrlCardsOfUser(
        curatorId.value,
        {
          page: 1,
          limit: 10,
          sortBy: CardSortField.UPDATED_AT,
          sortOrder: SortOrder.DESC,
          urlType: UrlType.VIDEO,
        },
      );

      expect(videoResult.items).toHaveLength(1);
      expect(videoResult.items[0]?.url).toBe(videoUrl.value);
    });

    it('should return empty result when no cards match the urlType filter', async () => {
      const articleUrl = URL.create('https://example.com/article').unwrap();
      const articleMetadata = UrlMetadata.create({
        url: articleUrl.value,
        title: 'Test Article',
        type: UrlType.ARTICLE,
      }).unwrap();

      const articleCard = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withUrlCard(articleUrl, articleMetadata)
        .buildOrThrow();

      await cardRepository.save(articleCard);
      articleCard.addToLibrary(curatorId);
      await cardRepository.save(articleCard);

      // Query for video type when only article exists
      const result = await queryRepository.getUrlCardsOfUser(curatorId.value, {
        page: 1,
        limit: 10,
        sortBy: CardSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
        urlType: UrlType.VIDEO,
      });

      expect(result.items).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });
  });
});
