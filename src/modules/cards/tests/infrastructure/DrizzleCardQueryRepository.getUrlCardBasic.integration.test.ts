import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import postgres from 'postgres';
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DrizzleCardQueryRepository } from '../../infrastructure/repositories/DrizzleCardQueryRepository';
import { DrizzleCardRepository } from '../../infrastructure/repositories/DrizzleCardRepository';
import { CuratorId } from '../../domain/value-objects/CuratorId';
import { UniqueEntityID } from '../../../../shared/domain/UniqueEntityID';
import { cards } from '../../infrastructure/repositories/schema/card.sql';
import { libraryMemberships } from '../../infrastructure/repositories/schema/libraryMembership.sql';
import { publishedRecords } from '../../infrastructure/repositories/schema/publishedRecord.sql';
import { CardBuilder } from '../utils/builders/CardBuilder';
import { URL } from '../../domain/value-objects/URL';
import { UrlMetadata } from '../../domain/value-objects/UrlMetadata';
import { createTestSchema } from '../test-utils/createTestSchema';
import { CardTypeEnum } from '../../domain/value-objects/CardType';

describe('DrizzleCardQueryRepository - getUrlCardBasic', () => {
  let container: StartedPostgreSqlContainer;
  let db: PostgresJsDatabase;
  let queryRepository: DrizzleCardQueryRepository;
  let cardRepository: DrizzleCardRepository;

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
    queryRepository = new DrizzleCardQueryRepository(db);
    cardRepository = new DrizzleCardRepository(db);

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
    await db.delete(libraryMemberships);
    await db.delete(cards);
    await db.delete(publishedRecords);
  });

  describe('getUrlCardBasic', () => {
    it('should return null when card does not exist', async () => {
      const nonExistentCardId = new UniqueEntityID().toString();

      const result = await queryRepository.getUrlCardBasic(nonExistentCardId);

      expect(result).toBeNull();
    });

    it('should return null when card exists but is not a URL card', async () => {
      // Create a note card
      const noteCard = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withNoteCard('This is a note')
        .buildOrThrow();

      await cardRepository.save(noteCard);

      const result = await queryRepository.getUrlCardBasic(
        noteCard.cardId.getStringValue(),
      );

      expect(result).toBeNull();
    });

    it('should return URL card with basic metadata', async () => {
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

      const result = await queryRepository.getUrlCardBasic(
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
      expect(result?.note).toBeUndefined();
    });

    it('should include connected note card by the same author', async () => {
      // Create URL card
      const url = URL.create('https://example.com/article-with-note').unwrap();
      const urlCard = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withUrlCard(url)
        .buildOrThrow();

      await cardRepository.save(urlCard);

      // Create connected note card by the same author
      const noteCard = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withNoteCard('This is my note about the article')
        .withParentCard(urlCard.cardId)
        .buildOrThrow();

      await cardRepository.save(noteCard);

      const result = await queryRepository.getUrlCardBasic(
        urlCard.cardId.getStringValue(),
      );

      expect(result).toBeDefined();
      expect(result?.note).toBeDefined();
      expect(result?.note?.id).toBe(noteCard.cardId.getStringValue());
      expect(result?.note?.text).toBe('This is my note about the article');
    });

    it('should NOT include note card by a different author', async () => {
      // Create URL card by first author
      const url = URL.create(
        'https://example.com/article-different-author',
      ).unwrap();
      const urlCard = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withUrlCard(url)
        .buildOrThrow();

      await cardRepository.save(urlCard);

      // Create connected note card by a DIFFERENT author
      const noteCard = new CardBuilder()
        .withCuratorId(otherCuratorId.value) // Different author
        .withNoteCard('This is someone elses note')
        .withParentCard(urlCard.cardId)
        .buildOrThrow();

      await cardRepository.save(noteCard);

      const result = await queryRepository.getUrlCardBasic(
        urlCard.cardId.getStringValue(),
      );

      expect(result).toBeDefined();
      expect(result?.note).toBeUndefined(); // Should not include note from different author
    });

    it('should handle URL card without metadata', async () => {
      // Create URL card without metadata
      const url = URL.create('https://example.com/minimal').unwrap();
      const urlCard = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withUrlCard(url)
        .buildOrThrow();

      await cardRepository.save(urlCard);

      const result = await queryRepository.getUrlCardBasic(
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
      expect(result?.note).toBeUndefined();
    });
  });
});
