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
import { createTestSchema } from '../test-utils/createTestSchema';
import { CardTypeEnum } from '../../domain/value-objects/CardType';

describe('DrizzleCardQueryRepository - getUrlCardView', () => {
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

  describe('getUrlCardView', () => {
    it('should return null when card does not exist', async () => {
      const nonExistentCardId = new UniqueEntityID().toString();

      const result = await queryRepository.getUrlCardView(nonExistentCardId);

      expect(result).toBeNull();
    });

    it('should return null when card exists but is not a URL card', async () => {
      // Create a note card
      const noteCard = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withNoteCard('This is a note')
        .buildOrThrow();

      await cardRepository.save(noteCard);

      const result = await queryRepository.getUrlCardView(
        noteCard.cardId.getStringValue(),
      );

      expect(result).toBeNull();
    });

    it('should return URL card view with basic metadata', async () => {
      // Create URL card with metadata
      const url = URL.create('https://example.com/article').unwrap();
      const urlMetadata = UrlMetadata.create({
        url: url.value,
        title: 'Test Article',
        description: 'A test article description',
        author: 'John Doe',
        imageUrl: 'https://example.com/image.jpg',
      }).unwrap();

      const urlCard = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withUrlCard(url, urlMetadata)
        .buildOrThrow();

      await cardRepository.save(urlCard);

      const result = await queryRepository.getUrlCardView(
        urlCard.cardId.getStringValue(),
      );

      expect(result).toBeDefined();
      expect(result?.id).toBe(urlCard.cardId.getStringValue());
      expect(result?.type).toBe(CardTypeEnum.URL);
      expect(result?.url).toBe(url.value);
      expect(result?.cardContent.title).toBe('Test Article');
      expect(result?.cardContent.description).toBe(
        'A test article description',
      );
      expect(result?.cardContent.author).toBe('John Doe');
      expect(result?.cardContent.imageUrl).toBe(
        'https://example.com/image.jpg',
      );
      expect(result?.libraries).toEqual([]);
      expect(result?.collections).toEqual([]);
    });

    it('should return URL card view with minimal metadata', async () => {
      // Create URL card without metadata
      const url = URL.create('https://example.com/minimal').unwrap();
      const urlCard = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withUrlCard(url)
        .buildOrThrow();

      await cardRepository.save(urlCard);

      const result = await queryRepository.getUrlCardView(
        urlCard.cardId.getStringValue(),
      );

      expect(result).toBeDefined();
      expect(result?.id).toBe(urlCard.cardId.getStringValue());
      expect(result?.type).toBe(CardTypeEnum.URL);
      expect(result?.url).toBe(url.value);
      expect(result?.cardContent.title).toBeUndefined();
      expect(result?.cardContent.description).toBeUndefined();
      expect(result?.cardContent.author).toBeUndefined();
      expect(result?.cardContent.imageUrl).toBeUndefined();
    });

    it('should include creator in library when URL card is in their library', async () => {
      // Create URL card
      const url = URL.create('https://example.com/creator-library').unwrap();
      const urlCard = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withUrlCard(url)
        .buildOrThrow();

      await cardRepository.save(urlCard);

      // Add card to creator's library (URL cards can only be in creator's library)
      urlCard.addToLibrary(curatorId);
      await cardRepository.save(urlCard);

      const result = await queryRepository.getUrlCardView(
        urlCard.cardId.getStringValue(),
      );

      expect(result).toBeDefined();
      expect(result?.libraries).toHaveLength(1);
      expect(result?.libraries[0]?.userId).toBe(curatorId.value);
    });

    it('should include collections that contain the card', async () => {
      // Create URL card
      const url = URL.create('https://example.com/collection-article').unwrap();
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
          authorId: otherCuratorId,
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
      collection2.addCard(urlCard.cardId, otherCuratorId);

      await collectionRepository.save(collection1);
      await collectionRepository.save(collection2);

      const result = await queryRepository.getUrlCardView(
        urlCard.cardId.getStringValue(),
      );

      expect(result).toBeDefined();
      expect(result?.collections).toHaveLength(2);

      // Check collection details
      const collectionNames = result?.collections.map((c) => c.name).sort();
      expect(collectionNames).toEqual(['Favorites', 'Reading List']);

      const readingListCollection = result?.collections.find(
        (c) => c.name === 'Reading List',
      );
      expect(readingListCollection?.id).toBe(
        collection1.collectionId.getStringValue(),
      );
      expect(readingListCollection?.authorId).toBe(curatorId.value);

      const favoritesCollection = result?.collections.find(
        (c) => c.name === 'Favorites',
      );
      expect(favoritesCollection?.id).toBe(
        collection2.collectionId.getStringValue(),
      );
      expect(favoritesCollection?.authorId).toBe(otherCuratorId.value);
    });

    it('should handle card with both library and collections', async () => {
      // Create URL card with full metadata
      const url = URL.create('https://example.com/comprehensive').unwrap();
      const urlMetadata = UrlMetadata.create({
        url: url.value,
        title: 'Comprehensive Article',
        description: 'An article with everything',
        author: 'Jane Smith',
        imageUrl: 'https://example.com/comprehensive.jpg',
        siteName: 'Example Site',
      }).unwrap();

      const urlCard = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withUrlCard(url, urlMetadata)
        .buildOrThrow();

      await cardRepository.save(urlCard);

      // Add to creator's library (URL cards can only be in creator's library)
      urlCard.addToLibrary(curatorId);
      await cardRepository.save(urlCard);

      // Create multiple collections
      const workCollection = Collection.create(
        {
          authorId: curatorId,
          name: 'Work Research',
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

      const sharedCollection = Collection.create(
        {
          authorId: otherCuratorId,
          name: 'Shared Articles',
          accessType: CollectionAccessType.OPEN,
          collaboratorIds: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        new UniqueEntityID(),
      ).unwrap();

      // Add card to collections
      workCollection.addCard(urlCard.cardId, curatorId);
      personalCollection.addCard(urlCard.cardId, curatorId);
      sharedCollection.addCard(urlCard.cardId, otherCuratorId);

      await collectionRepository.save(workCollection);
      await collectionRepository.save(personalCollection);
      await collectionRepository.save(sharedCollection);

      const result = await queryRepository.getUrlCardView(
        urlCard.cardId.getStringValue(),
      );

      expect(result).toBeDefined();

      // Check URL metadata
      expect(result?.cardContent.title).toBe('Comprehensive Article');
      expect(result?.cardContent.description).toBe(
        'An article with everything',
      );
      expect(result?.cardContent.author).toBe('Jane Smith');
      expect(result?.cardContent.imageUrl).toBe(
        'https://example.com/comprehensive.jpg',
      );

      // Check libraries - URL cards can only be in creator's library
      expect(result?.libraries).toHaveLength(1);
      expect(result?.libraries[0]?.userId).toBe(curatorId.value);

      // Check collections
      expect(result?.collections).toHaveLength(3);
      const collectionNames = result?.collections.map((c) => c.name).sort();
      expect(collectionNames).toEqual([
        'Personal Reading',
        'Shared Articles',
        'Work Research',
      ]);

      // Verify collection authors
      const workColl = result?.collections.find(
        (c) => c.name === 'Work Research',
      );
      expect(workColl?.authorId).toBe(curatorId.value);

      const sharedColl = result?.collections.find(
        (c) => c.name === 'Shared Articles',
      );
      expect(sharedColl?.authorId).toBe(otherCuratorId.value);
    });

    it('should handle card with no libraries or collections', async () => {
      // Create URL card that's not in any libraries or collections
      const url = URL.create('https://example.com/orphaned').unwrap();
      const urlCard = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withUrlCard(url)
        .buildOrThrow();

      await cardRepository.save(urlCard);

      const result = await queryRepository.getUrlCardView(
        urlCard.cardId.getStringValue(),
      );

      expect(result).toBeDefined();
      expect(result?.id).toBe(urlCard.cardId.getStringValue());
      expect(result?.type).toBe(CardTypeEnum.URL);
      expect(result?.url).toBe(url.value);
      expect(result?.libraries).toEqual([]);
      expect(result?.collections).toEqual([]);
    });

    it('should handle card in library but not in any collections', async () => {
      // Create URL card
      const url = URL.create('https://example.com/library-only').unwrap();
      const urlCard = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withUrlCard(url)
        .buildOrThrow();

      await cardRepository.save(urlCard);

      // Add to library only
      urlCard.addToLibrary(curatorId);
      await cardRepository.save(urlCard);

      const result = await queryRepository.getUrlCardView(
        urlCard.cardId.getStringValue(),
      );

      expect(result).toBeDefined();
      expect(result?.libraries).toHaveLength(1);
      expect(result?.libraries[0]?.userId).toBe(curatorId.value);
      expect(result?.collections).toEqual([]);
    });

    it('should handle card in collections but not in any libraries', async () => {
      // Create URL card
      const url = URL.create('https://example.com/collection-only').unwrap();
      const urlCard = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withUrlCard(url)
        .buildOrThrow();

      await cardRepository.save(urlCard);

      // Create collection and add card
      const collection = Collection.create(
        {
          authorId: curatorId,
          name: 'Collection Only',
          accessType: CollectionAccessType.OPEN,
          collaboratorIds: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        new UniqueEntityID(),
      ).unwrap();

      collection.addCard(urlCard.cardId, curatorId);
      await collectionRepository.save(collection);

      const result = await queryRepository.getUrlCardView(
        urlCard.cardId.getStringValue(),
      );

      expect(result).toBeDefined();
      expect(result?.libraries).toEqual([]);
      expect(result?.collections).toHaveLength(1);
      expect(result?.collections[0]?.name).toBe('Collection Only');
      expect(result?.collections[0]?.authorId).toBe(curatorId.value);
    });

    it('should handle duplicate library memberships gracefully', async () => {
      // Create URL card
      const url = URL.create('https://example.com/duplicate-test').unwrap();
      const urlCard = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withUrlCard(url)
        .buildOrThrow();

      await cardRepository.save(urlCard);

      // Add to library multiple times (should be handled by domain logic)
      urlCard.addToLibrary(curatorId);
      await cardRepository.save(urlCard);

      // Try to add again (should not create duplicate)
      urlCard.addToLibrary(curatorId);
      await cardRepository.save(urlCard);

      const result = await queryRepository.getUrlCardView(
        urlCard.cardId.getStringValue(),
      );

      expect(result).toBeDefined();
      expect(result?.libraries).toHaveLength(1);
      expect(result?.libraries[0]?.userId).toBe(curatorId.value);
    });

    it('should handle multiple collections from different users', async () => {
      // Create URL card
      const url = URL.create('https://example.com/popular-article').unwrap();
      const urlCard = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withUrlCard(url)
        .buildOrThrow();

      await cardRepository.save(urlCard);

      // Add to creator's library
      urlCard.addToLibrary(curatorId);
      await cardRepository.save(urlCard);

      // Create multiple collections from different users
      const collections = [];
      for (let i = 1; i <= 5; i++) {
        const collection = Collection.create(
          {
            authorId: curatorId,
            name: `Collection ${i}`,
            accessType: CollectionAccessType.OPEN,
            collaboratorIds: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          new UniqueEntityID(),
        ).unwrap();

        collection.addCard(urlCard.cardId, curatorId);
        await collectionRepository.save(collection);
        collections.push(collection);
      }

      const result = await queryRepository.getUrlCardView(
        urlCard.cardId.getStringValue(),
      );

      expect(result).toBeDefined();
      // URL cards can only be in creator's library
      expect(result?.libraries).toHaveLength(1);
      expect(result?.collections).toHaveLength(5);

      // Verify all collections are present
      const collectionNames = result?.collections.map((c) => c.name).sort();
      expect(collectionNames).toEqual([
        'Collection 1',
        'Collection 2',
        'Collection 3',
        'Collection 4',
        'Collection 5',
      ]);
    });

    it('should include connected note card in URL card view', async () => {
      // Create URL card with metadata
      const url = URL.create('https://example.com/article-with-note').unwrap();
      const urlMetadata = UrlMetadata.create({
        url: url.value,
        title: 'Article with Note',
        description: 'An article that has a connected note',
        author: 'Jane Doe',
        imageUrl: 'https://example.com/note-article.jpg',
      }).unwrap();

      const urlCard = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withUrlCard(url, urlMetadata)
        .buildOrThrow();

      await cardRepository.save(urlCard);

      // Create connected note card
      const noteCard = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withNoteCard(
          'This is my detailed analysis of the article. It covers several key points and provides additional insights.',
        )
        .withParentCard(urlCard.cardId)
        .buildOrThrow();

      await cardRepository.save(noteCard);

      // Add both cards to user's library
      urlCard.addToLibrary(curatorId);
      await cardRepository.save(urlCard);

      noteCard.addToLibrary(curatorId);
      await cardRepository.save(noteCard);

      const result = await queryRepository.getUrlCardView(
        urlCard.cardId.getStringValue(),
      );

      expect(result).toBeDefined();
      expect(result?.id).toBe(urlCard.cardId.getStringValue());
      expect(result?.type).toBe(CardTypeEnum.URL);
      expect(result?.url).toBe(url.value);

      // Check URL metadata
      expect(result?.cardContent.title).toBe('Article with Note');
      expect(result?.cardContent.description).toBe(
        'An article that has a connected note',
      );
      expect(result?.cardContent.author).toBe('Jane Doe');
      expect(result?.cardContent.imageUrl).toBe(
        'https://example.com/note-article.jpg',
      );

      // Check that the connected note is included
      expect(result?.note).toBeDefined();
      expect(result?.note?.id).toBe(noteCard.cardId.getStringValue());
      expect(result?.note?.text).toBe(
        'This is my detailed analysis of the article. It covers several key points and provides additional insights.',
      );

      // Check libraries
      expect(result?.libraries).toHaveLength(1);
      expect(result?.libraries[0]?.userId).toBe(curatorId.value);
    });

    it('should not include note cards that belong to different URL cards', async () => {
      // Create first URL card
      const url1 = URL.create('https://example.com/article1').unwrap();
      const urlCard1 = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withUrlCard(url1)
        .buildOrThrow();

      await cardRepository.save(urlCard1);

      // Create second URL card
      const url2 = URL.create('https://example.com/article2').unwrap();
      const urlCard2 = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withUrlCard(url2)
        .buildOrThrow();

      await cardRepository.save(urlCard2);

      // Create note card connected to the SECOND URL card
      const noteCard = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withNoteCard('This note is for article 2')
        .withParentCard(urlCard2.cardId)
        .buildOrThrow();

      await cardRepository.save(noteCard);

      // Add cards to libraries
      urlCard1.addToLibrary(curatorId);
      await cardRepository.save(urlCard1);

      urlCard2.addToLibrary(curatorId);
      await cardRepository.save(urlCard2);

      noteCard.addToLibrary(curatorId);
      await cardRepository.save(noteCard);

      // Query the FIRST URL card
      const result = await queryRepository.getUrlCardView(
        urlCard1.cardId.getStringValue(),
      );

      expect(result).toBeDefined();
      expect(result?.id).toBe(urlCard1.cardId.getStringValue());

      // Should NOT have a note since the note belongs to urlCard2
      expect(result?.note).toBeUndefined();
    });
  });

  describe('getLibrariesForCard', () => {
    it('should return empty array when card has no library memberships', async () => {
      // Create URL card but don't add to any libraries
      const url = URL.create('https://example.com/no-libraries').unwrap();
      const urlCard = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withUrlCard(url)
        .buildOrThrow();

      await cardRepository.save(urlCard);

      const result = await queryRepository.getLibrariesForCard(
        urlCard.cardId.getStringValue(),
      );

      expect(result).toEqual([]);
    });

    it('should return single user ID when card is in one library', async () => {
      // Create URL card
      const url = URL.create('https://example.com/single-library').unwrap();
      const urlCard = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withUrlCard(url)
        .buildOrThrow();

      await cardRepository.save(urlCard);

      // Add to one user's library
      urlCard.addToLibrary(curatorId);
      await cardRepository.save(urlCard);

      const result = await queryRepository.getLibrariesForCard(
        urlCard.cardId.getStringValue(),
      );

      expect(result).toHaveLength(1);
      expect(result).toContain(curatorId.value);
    });

    it('should return creator ID for URL card in creator library', async () => {
      // Create URL card
      const url = URL.create('https://example.com/creator-library').unwrap();
      const urlCard = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withUrlCard(url)
        .buildOrThrow();

      await cardRepository.save(urlCard);

      // Add to creator's library (URL cards can only be in creator's library)
      urlCard.addToLibrary(curatorId);
      await cardRepository.save(urlCard);

      const result = await queryRepository.getLibrariesForCard(
        urlCard.cardId.getStringValue(),
      );

      expect(result).toHaveLength(1);
      expect(result).toContain(curatorId.value);
    });

    it('should return empty array for non-existent card', async () => {
      const nonExistentCardId = new UniqueEntityID().toString();

      const result =
        await queryRepository.getLibrariesForCard(nonExistentCardId);

      expect(result).toEqual([]);
    });

    it('should handle duplicate library memberships gracefully', async () => {
      // Create URL card
      const url = URL.create('https://example.com/duplicate-test').unwrap();
      const urlCard = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withUrlCard(url)
        .buildOrThrow();

      await cardRepository.save(urlCard);

      // Add to library multiple times (domain logic should prevent duplicates)
      urlCard.addToLibrary(curatorId);
      await cardRepository.save(urlCard);

      urlCard.addToLibrary(curatorId);
      await cardRepository.save(urlCard);

      const result = await queryRepository.getLibrariesForCard(
        urlCard.cardId.getStringValue(),
      );

      expect(result).toHaveLength(1);
      expect(result).toContain(curatorId.value);
    });

    it('should work with both URL and NOTE cards', async () => {
      // Create URL card
      const url = URL.create('https://example.com/with-note').unwrap();
      const urlCard = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withUrlCard(url)
        .buildOrThrow();

      await cardRepository.save(urlCard);

      // Create note card
      const noteCard = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withNoteCard('Test note')
        .buildOrThrow();

      await cardRepository.save(noteCard);

      // Add both cards to libraries
      urlCard.addToLibrary(curatorId);
      await cardRepository.save(urlCard);

      noteCard.addToLibrary(otherCuratorId);
      await cardRepository.save(noteCard);

      // Test URL card libraries
      const urlResult = await queryRepository.getLibrariesForCard(
        urlCard.cardId.getStringValue(),
      );
      expect(urlResult).toEqual([curatorId.value]);

      // Test note card libraries
      const noteResult = await queryRepository.getLibrariesForCard(
        noteCard.cardId.getStringValue(),
      );
      expect(noteResult).toEqual([otherCuratorId.value]);
    });

    it('should return libraries in consistent order', async () => {
      // Create URL card
      const url = URL.create('https://example.com/order-test').unwrap();
      const urlCard = new CardBuilder()
        .withCuratorId(thirdCuratorId.value)
        .withUrlCard(url)
        .buildOrThrow();

      await cardRepository.save(urlCard);

      // Add to creator's library (URL cards can only be in creator's library)
      urlCard.addToLibrary(thirdCuratorId);
      await cardRepository.save(urlCard);

      const result = await queryRepository.getLibrariesForCard(
        urlCard.cardId.getStringValue(),
      );

      expect(result).toHaveLength(1);
      expect(result).toContain(thirdCuratorId.value);
    });
  });
});
