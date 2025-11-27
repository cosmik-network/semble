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

describe('DrizzleCardQueryRepository - getCardsInCollection', () => {
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

  describe('getCardsInCollection', () => {
    it('should return empty result when collection has no URL cards', async () => {
      // Create empty collection
      const collection = Collection.create(
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

      await collectionRepository.save(collection);

      const result = await queryRepository.getCardsInCollection(
        collection.collectionId.getStringValue(),
        {
          page: 1,
          limit: 10,
          sortBy: CardSortField.UPDATED_AT,
          sortOrder: SortOrder.DESC,
        },
      );

      expect(result.items).toHaveLength(0);
      expect(result.totalCount).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('should return URL cards in a collection', async () => {
      // Create URL cards
      const url1 = URL.create('https://example.com/article1').unwrap();
      const urlMetadata1 = UrlMetadata.create({
        url: url1.value,
        title: 'Collection Article 1',
        description: 'First article in collection',
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

      // Create collection and add cards
      const collection = Collection.create(
        {
          authorId: curatorId,
          name: 'Test Collection',
          accessType: CollectionAccessType.OPEN,
          collaboratorIds: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        new UniqueEntityID(),
      ).unwrap();

      collection.addCard(urlCard1.cardId, curatorId);
      collection.addCard(urlCard2.cardId, curatorId);

      await collectionRepository.save(collection);

      // Query cards in collection
      const result = await queryRepository.getCardsInCollection(
        collection.collectionId.getStringValue(),
        {
          page: 1,
          limit: 10,
          sortBy: CardSortField.UPDATED_AT,
          sortOrder: SortOrder.DESC,
        },
      );

      expect(result.items).toHaveLength(2);
      expect(result.totalCount).toBe(2);
      expect(result.hasMore).toBe(false);

      // Check URL card data
      const card1Result = result.items.find((item) => item.url === url1.value);
      const card2Result = result.items.find((item) => item.url === url2.value);

      expect(card1Result).toBeDefined();
      expect(card1Result?.type).toBe(CardTypeEnum.URL);
      expect(card1Result?.cardContent.title).toBe('Collection Article 1');
      expect(card1Result?.cardContent.description).toBe(
        'First article in collection',
      );
      expect(card1Result?.cardContent.author).toBe('John Doe');
      expect(card1Result?.cardContent.thumbnailUrl).toBe(
        'https://example.com/image1.jpg',
      );

      expect(card2Result).toBeDefined();
      expect(card2Result?.type).toBe(CardTypeEnum.URL);
      expect(card2Result?.cardContent.title).toBeUndefined(); // No metadata provided
    });

    it('should only include notes by collection author, not notes by other users', async () => {
      // Create URL card
      const url = URL.create('https://example.com/shared-article').unwrap();
      const urlCard = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withUrlCard(url)
        .buildOrThrow();

      urlCard.addToLibrary(curatorId);

      await cardRepository.save(urlCard);

      // Create note by collection author
      const authorNote = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withNoteCard('Note by collection author')
        .withParentCard(urlCard.cardId)
        .buildOrThrow();

      authorNote.addToLibrary(curatorId);

      await cardRepository.save(authorNote);

      // Create note by different user on the same URL card
      const otherUserNote = new CardBuilder()
        .withCuratorId(otherCuratorId.value)
        .withNoteCard('Note by other user')
        .withParentCard(urlCard.cardId)
        .buildOrThrow();

      otherUserNote.addToLibrary(otherCuratorId);

      await cardRepository.save(otherUserNote);

      // Create collection authored by curatorId and add URL card
      const collection = Collection.create(
        {
          authorId: curatorId,
          name: 'Collection by First User',
          accessType: CollectionAccessType.OPEN,
          collaboratorIds: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        new UniqueEntityID(),
      ).unwrap();

      collection.addCard(urlCard.cardId, curatorId);
      await collectionRepository.save(collection);

      // Query cards in collection
      const result = await queryRepository.getCardsInCollection(
        collection.collectionId.getStringValue(),
        {
          page: 1,
          limit: 10,
          sortBy: CardSortField.UPDATED_AT,
          sortOrder: SortOrder.DESC,
        },
      );

      expect(result.items).toHaveLength(1);
      const urlCardResult = result.items[0];

      // Should only include the note by the collection author, not the other user's note
      expect(urlCardResult?.note).toBeDefined();
      expect(urlCardResult?.note?.id).toBe(authorNote.cardId.getStringValue());
      expect(urlCardResult?.note?.text).toBe('Note by collection author');
    });

    it('should not include notes when only other users have notes, not collection author', async () => {
      // Create URL card
      const url = URL.create(
        'https://example.com/article-with-other-notes',
      ).unwrap();
      const urlCard = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withUrlCard(url)
        .buildOrThrow();

      urlCard.addToLibrary(curatorId);

      await cardRepository.save(urlCard);

      // Create note by different user on the URL card (NO note by collection author)
      const otherUserNote = new CardBuilder()
        .withCuratorId(otherCuratorId.value)
        .withNoteCard('Note by other user only')
        .withParentCard(urlCard.cardId)
        .buildOrThrow();

      otherUserNote.addToLibrary(otherCuratorId);

      await cardRepository.save(otherUserNote);

      // Create collection authored by curatorId and add URL card
      const collection = Collection.create(
        {
          authorId: curatorId,
          name: 'Collection with Other User Notes Only',
          accessType: CollectionAccessType.OPEN,
          collaboratorIds: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        new UniqueEntityID(),
      ).unwrap();

      collection.addCard(urlCard.cardId, curatorId);
      await collectionRepository.save(collection);

      // Query cards in collection
      const result = await queryRepository.getCardsInCollection(
        collection.collectionId.getStringValue(),
        {
          page: 1,
          limit: 10,
          sortBy: CardSortField.UPDATED_AT,
          sortOrder: SortOrder.DESC,
        },
      );

      expect(result.items).toHaveLength(1);
      const urlCardResult = result.items[0];

      // Should not include any note since only other users have notes, not the collection author
      expect(urlCardResult?.note).toBeUndefined();
    });

    it('should not include note cards that are not connected to collection URL cards', async () => {
      // Create URL card in collection
      const url = URL.create('https://example.com/collection-article').unwrap();
      const urlCard = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withUrlCard(url)
        .buildOrThrow();

      await cardRepository.save(urlCard);

      // Create another URL card NOT in collection
      const otherUrl = URL.create('https://example.com/other-article').unwrap();
      const otherUrlCard = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withUrlCard(otherUrl)
        .buildOrThrow();

      await cardRepository.save(otherUrlCard);

      // Create note card connected to the OTHER URL card (not in collection)
      const noteCard = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withNoteCard('This note is for the other article')
        .withParentCard(otherUrlCard.cardId)
        .buildOrThrow();

      await cardRepository.save(noteCard);

      // Create collection and add only the first URL card
      const collection = Collection.create(
        {
          authorId: curatorId,
          name: 'Selective Collection',
          accessType: CollectionAccessType.OPEN,
          collaboratorIds: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        new UniqueEntityID(),
      ).unwrap();

      collection.addCard(urlCard.cardId, curatorId);
      await collectionRepository.save(collection);

      // Query cards in collection
      const result = await queryRepository.getCardsInCollection(
        collection.collectionId.getStringValue(),
        {
          page: 1,
          limit: 10,
          sortBy: CardSortField.UPDATED_AT,
          sortOrder: SortOrder.DESC,
        },
      );

      expect(result.items).toHaveLength(1);
      const urlCardResult = result.items[0];

      // Should not have a note since the note is connected to a different URL card
      expect(urlCardResult?.note).toBeUndefined();
    });

    it('should handle collection with cards from multiple users', async () => {
      // Create URL cards from different users
      const url1 = URL.create('https://example.com/user1-article').unwrap();
      const urlCard1 = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withUrlCard(url1)
        .buildOrThrow();

      const url2 = URL.create('https://example.com/user2-article').unwrap();
      const urlCard2 = new CardBuilder()
        .withCuratorId(otherCuratorId.value)
        .withUrlCard(url2)
        .buildOrThrow();

      await cardRepository.save(urlCard1);
      await cardRepository.save(urlCard2);

      // Create collection and add both cards
      const collection = Collection.create(
        {
          authorId: curatorId,
          name: 'Multi-User Collection',
          accessType: CollectionAccessType.OPEN,
          collaboratorIds: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        new UniqueEntityID(),
      ).unwrap();

      collection.addCard(urlCard1.cardId, curatorId);
      collection.addCard(urlCard2.cardId, curatorId);
      await collectionRepository.save(collection);

      // Query cards in collection
      const result = await queryRepository.getCardsInCollection(
        collection.collectionId.getStringValue(),
        {
          page: 1,
          limit: 10,
          sortBy: CardSortField.UPDATED_AT,
          sortOrder: SortOrder.DESC,
        },
      );

      expect(result.items).toHaveLength(2);

      const urls = result.items.map((item) => item.url);
      expect(urls).toContain(url1.value);
      expect(urls).toContain(url2.value);
    });

    it('should not return note cards directly from collection', async () => {
      // Create a standalone note card
      const noteCard = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withNoteCard('Standalone note in collection')
        .buildOrThrow();

      await cardRepository.save(noteCard);

      // Create collection and add note card directly
      const collection = Collection.create(
        {
          authorId: curatorId,
          name: 'Collection with Direct Note',
          accessType: CollectionAccessType.OPEN,
          collaboratorIds: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        new UniqueEntityID(),
      ).unwrap();

      collection.addCard(noteCard.cardId, curatorId);
      await collectionRepository.save(collection);

      // Query cards in collection
      const result = await queryRepository.getCardsInCollection(
        collection.collectionId.getStringValue(),
        {
          page: 1,
          limit: 10,
          sortBy: CardSortField.UPDATED_AT,
          sortOrder: SortOrder.DESC,
        },
      );

      // Should not return the note card since we only return URL cards
      expect(result.items).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });

    it('should handle sorting by library count in collection', async () => {
      // Create 3 URL cards with different popularity levels
      const url1 = URL.create('https://example.com/most-popular').unwrap();
      const url2 = URL.create('https://example.com/medium-popular').unwrap();
      const url3 = URL.create('https://example.com/least-popular').unwrap();

      // Create URL cards from the first curator (collection author)
      const urlCard1 = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withUrlCard(url1)
        .withCreatedAt(new Date('2023-01-01'))
        .withUpdatedAt(new Date('2023-01-01'))
        .buildOrThrow();

      const urlCard2 = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withUrlCard(url2)
        .withCreatedAt(new Date('2023-01-02'))
        .withUpdatedAt(new Date('2023-01-02'))
        .buildOrThrow();

      const urlCard3 = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withUrlCard(url3)
        .withCreatedAt(new Date('2023-01-03'))
        .withUpdatedAt(new Date('2023-01-03'))
        .buildOrThrow();

      await cardRepository.save(urlCard1);
      await cardRepository.save(urlCard2);
      await cardRepository.save(urlCard3);

      // Add cards to creator's library
      urlCard1.addToLibrary(curatorId);
      urlCard2.addToLibrary(curatorId);
      urlCard3.addToLibrary(curatorId);

      await cardRepository.save(urlCard1);
      await cardRepository.save(urlCard2);
      await cardRepository.save(urlCard3);

      // Create additional cards for the same URLs from other users to increase library counts
      // URL 1 will be in 3 libraries (curatorId, otherCuratorId, thirdCuratorId)
      const urlCard1_user2 = new CardBuilder()
        .withCuratorId(otherCuratorId.value)
        .withUrlCard(url1)
        .buildOrThrow();

      const urlCard1_user3 = new CardBuilder()
        .withCuratorId(thirdCuratorId.value)
        .withUrlCard(url1)
        .buildOrThrow();

      await cardRepository.save(urlCard1_user2);
      await cardRepository.save(urlCard1_user3);

      urlCard1_user2.addToLibrary(otherCuratorId);
      urlCard1_user3.addToLibrary(thirdCuratorId);

      await cardRepository.save(urlCard1_user2);
      await cardRepository.save(urlCard1_user3);

      // URL 2 will be in 2 libraries (curatorId, otherCuratorId)
      const urlCard2_user2 = new CardBuilder()
        .withCuratorId(otherCuratorId.value)
        .withUrlCard(url2)
        .buildOrThrow();

      await cardRepository.save(urlCard2_user2);
      urlCard2_user2.addToLibrary(otherCuratorId);
      await cardRepository.save(urlCard2_user2);

      // URL 3 will be in 1 library (only curatorId) - no additional cards needed

      // Create collection and add all three cards
      const collection = Collection.create(
        {
          authorId: curatorId,
          name: 'Popularity Collection',
          accessType: CollectionAccessType.OPEN,
          collaboratorIds: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        new UniqueEntityID(),
      ).unwrap();

      collection.addCard(urlCard1.cardId, curatorId);
      collection.addCard(urlCard2.cardId, curatorId);
      collection.addCard(urlCard3.cardId, curatorId);
      await collectionRepository.save(collection);

      // Query cards sorted by library count descending
      const result = await queryRepository.getCardsInCollection(
        collection.collectionId.getStringValue(),
        {
          page: 1,
          limit: 10,
          sortBy: CardSortField.LIBRARY_COUNT,
          sortOrder: SortOrder.DESC,
        },
      );

      expect(result.items).toHaveLength(3);

      // Verify sorting by library count (descending)
      expect(result.items[0]?.url).toBe(url1.value); // Most popular (3 libraries)
      expect(result.items[0]?.libraryCount).toBe(3);

      expect(result.items[1]?.url).toBe(url2.value); // Medium popular (2 libraries)
      expect(result.items[1]?.libraryCount).toBe(2);

      expect(result.items[2]?.url).toBe(url3.value); // Least popular (1 library)
      expect(result.items[2]?.libraryCount).toBe(1);
    });

    it('should handle pagination for collection cards', async () => {
      // Create multiple URL cards
      const urlCards = [];
      for (let i = 1; i <= 5; i++) {
        const url = URL.create(
          `https://example.com/collection-article${i}`,
        ).unwrap();
        const urlCard = new CardBuilder()
          .withCuratorId(curatorId.value)
          .withUrlCard(url)
          .withCreatedAt(new Date(`2023-01-${i.toString().padStart(2, '0')}`))
          .withUpdatedAt(new Date(`2023-01-${i.toString().padStart(2, '0')}`))
          .buildOrThrow();

        await cardRepository.save(urlCard);
        urlCards.push(urlCard);
      }

      // Create collection and add all cards
      const collection = Collection.create(
        {
          authorId: curatorId,
          name: 'Large Collection',
          accessType: CollectionAccessType.OPEN,
          collaboratorIds: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        new UniqueEntityID(),
      ).unwrap();

      for (const urlCard of urlCards) {
        collection.addCard(urlCard.cardId, curatorId);
      }
      await collectionRepository.save(collection);

      // Test first page
      const page1 = await queryRepository.getCardsInCollection(
        collection.collectionId.getStringValue(),
        {
          page: 1,
          limit: 2,
          sortBy: CardSortField.UPDATED_AT,
          sortOrder: SortOrder.ASC,
        },
      );

      expect(page1.items).toHaveLength(2);
      expect(page1.totalCount).toBe(5);
      expect(page1.hasMore).toBe(true);

      // Test second page
      const page2 = await queryRepository.getCardsInCollection(
        collection.collectionId.getStringValue(),
        {
          page: 2,
          limit: 2,
          sortBy: CardSortField.UPDATED_AT,
          sortOrder: SortOrder.ASC,
        },
      );

      expect(page2.items).toHaveLength(2);
      expect(page2.totalCount).toBe(5);
      expect(page2.hasMore).toBe(true);

      // Test last page
      const page3 = await queryRepository.getCardsInCollection(
        collection.collectionId.getStringValue(),
        {
          page: 3,
          limit: 2,
          sortBy: CardSortField.UPDATED_AT,
          sortOrder: SortOrder.ASC,
        },
      );

      expect(page3.items).toHaveLength(1);
      expect(page3.totalCount).toBe(5);
      expect(page3.hasMore).toBe(false);
    });
  });

  describe('urlInLibrary', () => {
    it('should return urlInLibrary as undefined when callingUserId is not provided', async () => {
      const url = URL.create('https://example.com/collection-url').unwrap();
      const urlCard = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withUrlCard(url)
        .buildOrThrow();

      await cardRepository.save(urlCard);

      // Create collection and add card
      const collection = Collection.create(
        {
          authorId: curatorId,
          name: 'Test Collection',
          accessType: CollectionAccessType.OPEN,
          collaboratorIds: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        new UniqueEntityID(),
      ).unwrap();

      collection.addCard(urlCard.cardId, curatorId);
      await collectionRepository.save(collection);

      // Query without callingUserId
      const result = await queryRepository.getCardsInCollection(
        collection.collectionId.getStringValue(),
        {
          page: 1,
          limit: 10,
          sortBy: CardSortField.UPDATED_AT,
          sortOrder: SortOrder.DESC,
        },
      );

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.urlInLibrary).toBeUndefined();
    });

    it('should return urlInLibrary as true when callingUserId has the URL in their library', async () => {
      const sharedUrl = 'https://example.com/shared-collection-url';
      const url = URL.create(sharedUrl).unwrap();

      // Create URL card for first user and add to collection
      const urlCard1 = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withUrlCard(url)
        .buildOrThrow();

      await cardRepository.save(urlCard1);

      // Create collection and add card
      const collection = Collection.create(
        {
          authorId: curatorId,
          name: 'Shared Collection',
          accessType: CollectionAccessType.OPEN,
          collaboratorIds: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        new UniqueEntityID(),
      ).unwrap();

      collection.addCard(urlCard1.cardId, curatorId);
      await collectionRepository.save(collection);

      // Create URL card for second user with the same URL
      const urlCard2 = new CardBuilder()
        .withCuratorId(otherCuratorId.value)
        .withUrlCard(url)
        .buildOrThrow();

      await cardRepository.save(urlCard2);
      urlCard2.addToLibrary(otherCuratorId);
      await cardRepository.save(urlCard2);

      // Query collection cards with second user as callingUserId
      const result = await queryRepository.getCardsInCollection(
        collection.collectionId.getStringValue(),
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
      const url = URL.create(
        'https://example.com/unique-collection-url',
      ).unwrap();

      // Create URL card for first user and add to collection
      const urlCard = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withUrlCard(url)
        .buildOrThrow();

      await cardRepository.save(urlCard);

      // Create collection and add card
      const collection = Collection.create(
        {
          authorId: curatorId,
          name: 'Unique Collection',
          accessType: CollectionAccessType.OPEN,
          collaboratorIds: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        new UniqueEntityID(),
      ).unwrap();

      collection.addCard(urlCard.cardId, curatorId);
      await collectionRepository.save(collection);

      // Query collection cards with second user as callingUserId (who doesn't have this URL)
      const result = await queryRepository.getCardsInCollection(
        collection.collectionId.getStringValue(),
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

    it('should return urlInLibrary as true when the collection author is the same as callingUserId', async () => {
      const url = URL.create(
        'https://example.com/author-collection-url',
      ).unwrap();

      // Create URL card for curator (collection author)
      const urlCard = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withUrlCard(url)
        .buildOrThrow();

      await cardRepository.save(urlCard);
      urlCard.addToLibrary(curatorId);
      await cardRepository.save(urlCard);

      // Create collection and add card
      const collection = Collection.create(
        {
          authorId: curatorId,
          name: 'Author Collection',
          accessType: CollectionAccessType.OPEN,
          collaboratorIds: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        new UniqueEntityID(),
      ).unwrap();

      collection.addCard(urlCard.cardId, curatorId);
      await collectionRepository.save(collection);

      // Query collection cards with the author as callingUserId
      const result = await queryRepository.getCardsInCollection(
        collection.collectionId.getStringValue(),
        {
          page: 1,
          limit: 10,
          sortBy: CardSortField.UPDATED_AT,
          sortOrder: SortOrder.DESC,
        },
        curatorId.value, // same as collection author
      );

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.urlInLibrary).toBe(true); // curator has their own URL
    });

    it('should return urlInLibrary correctly when user has multiple cards with the same URL', async () => {
      const sharedUrl = 'https://example.com/multi-card-collection-url';
      const url = URL.create(sharedUrl).unwrap();

      // Create URL card for first user and add to collection
      const urlCard1 = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withUrlCard(url)
        .buildOrThrow();

      await cardRepository.save(urlCard1);

      // Create collection and add card
      const collection = Collection.create(
        {
          authorId: curatorId,
          name: 'Multi-Card Collection',
          accessType: CollectionAccessType.OPEN,
          collaboratorIds: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        new UniqueEntityID(),
      ).unwrap();

      collection.addCard(urlCard1.cardId, curatorId);
      await collectionRepository.save(collection);

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

      // Query collection cards with second user as callingUserId
      const result = await queryRepository.getCardsInCollection(
        collection.collectionId.getStringValue(),
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

    it('should handle multiple URLs in collection with different urlInLibrary values', async () => {
      // URL 1: otherCurator also has it
      const url1 = URL.create(
        'https://example.com/shared-collection-url-1',
      ).unwrap();
      const urlCard1a = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withUrlCard(url1)
        .withCreatedAt(new Date('2023-01-01'))
        .withUpdatedAt(new Date('2023-01-01'))
        .buildOrThrow();

      await cardRepository.save(urlCard1a);

      const urlCard1b = new CardBuilder()
        .withCuratorId(otherCuratorId.value)
        .withUrlCard(url1)
        .buildOrThrow();

      await cardRepository.save(urlCard1b);
      urlCard1b.addToLibrary(otherCuratorId);
      await cardRepository.save(urlCard1b);

      // URL 2: otherCurator does NOT have it
      const url2 = URL.create(
        'https://example.com/unique-collection-url-2',
      ).unwrap();
      const urlCard2 = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withUrlCard(url2)
        .withCreatedAt(new Date('2023-01-02'))
        .withUpdatedAt(new Date('2023-01-02'))
        .buildOrThrow();

      await cardRepository.save(urlCard2);

      // Create collection and add both cards
      const collection = Collection.create(
        {
          authorId: curatorId,
          name: 'Mixed Collection',
          accessType: CollectionAccessType.OPEN,
          collaboratorIds: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        new UniqueEntityID(),
      ).unwrap();

      collection.addCard(urlCard1a.cardId, curatorId);
      collection.addCard(urlCard2.cardId, curatorId);
      await collectionRepository.save(collection);

      // Query collection cards with otherCurator as callingUserId
      const result = await queryRepository.getCardsInCollection(
        collection.collectionId.getStringValue(),
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

    it('should correctly handle urlInLibrary with third user viewing collection', async () => {
      const sharedUrl = 'https://example.com/popular-collection-url';
      const url = URL.create(sharedUrl).unwrap();

      // First user creates card and adds to collection
      const urlCard1 = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withUrlCard(url)
        .buildOrThrow();

      await cardRepository.save(urlCard1);
      urlCard1.addToLibrary(curatorId);
      await cardRepository.save(urlCard1);

      // Create collection and add card
      const collection = Collection.create(
        {
          authorId: curatorId,
          name: 'Popular Collection',
          accessType: CollectionAccessType.OPEN,
          collaboratorIds: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        new UniqueEntityID(),
      ).unwrap();

      collection.addCard(urlCard1.cardId, curatorId);
      await collectionRepository.save(collection);

      // Second user creates card with the same URL
      const urlCard2 = new CardBuilder()
        .withCuratorId(otherCuratorId.value)
        .withUrlCard(url)
        .buildOrThrow();

      await cardRepository.save(urlCard2);
      urlCard2.addToLibrary(otherCuratorId);
      await cardRepository.save(urlCard2);

      // Query collection cards with third user as callingUserId (who doesn't have this URL)
      const result = await queryRepository.getCardsInCollection(
        collection.collectionId.getStringValue(),
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
});
