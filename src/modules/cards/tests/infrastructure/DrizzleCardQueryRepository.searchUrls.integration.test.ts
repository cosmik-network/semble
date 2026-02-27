import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import postgres from 'postgres';
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DrizzleCardQueryRepository } from '../../infrastructure/repositories/DrizzleCardQueryRepository';
import { DrizzleCardRepository } from '../../infrastructure/repositories/DrizzleCardRepository';
import { CuratorId } from '../../domain/value-objects/CuratorId';
import { cards } from '../../infrastructure/repositories/schema/card.sql';
import { libraryMemberships } from '../../infrastructure/repositories/schema/libraryMembership.sql';
import { publishedRecords } from '../../infrastructure/repositories/schema/publishedRecord.sql';
import { CardBuilder } from '../utils/builders/CardBuilder';
import { URL } from '../../domain/value-objects/URL';
import { UrlMetadata } from '../../domain/value-objects/UrlMetadata';
import { CardSortField, SortOrder } from '../../domain/ICardQueryRepository';
import { createTestSchema } from '../test-utils/createTestSchema';
import { UrlType } from '../../domain/value-objects/UrlType';

describe('DrizzleCardQueryRepository - searchUrls', () => {
  let container: StartedPostgreSqlContainer;
  let db: PostgresJsDatabase;
  let queryRepository: DrizzleCardQueryRepository;
  let cardRepository: DrizzleCardRepository;

  // Test data
  let curator1: CuratorId;
  let curator2: CuratorId;
  let curator3: CuratorId;

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
    curator1 = CuratorId.create('did:plc:curator1').unwrap();
    curator2 = CuratorId.create('did:plc:curator2').unwrap();
    curator3 = CuratorId.create('did:plc:curator3').unwrap();
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

  describe('Basic search functionality', () => {
    it('should find URLs matching search query in title', async () => {
      const url1 = URL.create('https://example.com/quantum').unwrap();
      const metadata1 = UrlMetadata.create({
        url: url1.value,
        title: 'Introduction to Quantum Computing',
        description: 'A comprehensive guide',
      }).unwrap();

      const url2 = URL.create('https://example.com/classical').unwrap();
      const metadata2 = UrlMetadata.create({
        url: url2.value,
        title: 'Classical Computing Basics',
        description: 'Learn the fundamentals',
      }).unwrap();

      const card1 = new CardBuilder()
        .withCuratorId(curator1.value)
        .withUrlCard(url1, metadata1)
        .buildOrThrow();

      const card2 = new CardBuilder()
        .withCuratorId(curator1.value)
        .withUrlCard(url2, metadata2)
        .buildOrThrow();

      card1.addToLibrary(curator1);
      card2.addToLibrary(curator1);

      await cardRepository.save(card1);
      await cardRepository.save(card2);

      const result = await queryRepository.searchUrls({
        searchQuery: 'quantum',
        page: 1,
        limit: 10,
        sortBy: CardSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]!.url).toBe(url1.value);
      expect(result.items[0]!.contentData.metadata.title).toBe(
        'Introduction to Quantum Computing',
      );
      expect(result.totalCount).toBe(1);
    });

    it('should find URLs matching search query in description', async () => {
      const url1 = URL.create('https://example.com/article1').unwrap();
      const metadata1 = UrlMetadata.create({
        url: url1.value,
        title: 'Article One',
        description: 'This discusses machine learning algorithms',
      }).unwrap();

      const url2 = URL.create('https://example.com/article2').unwrap();
      const metadata2 = UrlMetadata.create({
        url: url2.value,
        title: 'Article Two',
        description: 'A different topic entirely',
      }).unwrap();

      const card1 = new CardBuilder()
        .withCuratorId(curator1.value)
        .withUrlCard(url1, metadata1)
        .buildOrThrow();

      const card2 = new CardBuilder()
        .withCuratorId(curator1.value)
        .withUrlCard(url2, metadata2)
        .buildOrThrow();

      card1.addToLibrary(curator1);
      card2.addToLibrary(curator1);

      await cardRepository.save(card1);
      await cardRepository.save(card2);

      const result = await queryRepository.searchUrls({
        searchQuery: 'machine learning',
        page: 1,
        limit: 10,
        sortBy: CardSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]!.url).toBe(url1.value);
    });

    it('should find URLs matching search query in URL field', async () => {
      const url1 = URL.create('https://github.com/example/repo').unwrap();
      const metadata1 = UrlMetadata.create({
        url: url1.value,
        title: 'Example Repository',
        description: 'A code repository',
      }).unwrap();

      const url2 = URL.create('https://gitlab.com/example/repo').unwrap();
      const metadata2 = UrlMetadata.create({
        url: url2.value,
        title: 'Another Repository',
        description: 'Another code repository',
      }).unwrap();

      const card1 = new CardBuilder()
        .withCuratorId(curator1.value)
        .withUrlCard(url1, metadata1)
        .buildOrThrow();

      const card2 = new CardBuilder()
        .withCuratorId(curator1.value)
        .withUrlCard(url2, metadata2)
        .buildOrThrow();

      card1.addToLibrary(curator1);
      card2.addToLibrary(curator1);

      await cardRepository.save(card1);
      await cardRepository.save(card2);

      const result = await queryRepository.searchUrls({
        searchQuery: 'github.com',
        page: 1,
        limit: 10,
        sortBy: CardSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]!.url).toBe(url1.value);
    });
  });

  describe('Tokenized substring search', () => {
    it('should match all words in query across different fields', async () => {
      const url1 = URL.create('https://example.com/article1').unwrap();
      const metadata1 = UrlMetadata.create({
        url: url1.value,
        title: 'Machine Learning Fundamentals',
        description: 'Introduction to neural networks',
      }).unwrap();

      const url2 = URL.create('https://example.com/article2').unwrap();
      const metadata2 = UrlMetadata.create({
        url: url2.value,
        title: 'Deep Learning Guide',
        description: 'Advanced machine learning techniques',
      }).unwrap();

      const card1 = new CardBuilder()
        .withCuratorId(curator1.value)
        .withUrlCard(url1, metadata1)
        .buildOrThrow();

      const card2 = new CardBuilder()
        .withCuratorId(curator1.value)
        .withUrlCard(url2, metadata2)
        .buildOrThrow();

      card1.addToLibrary(curator1);
      card2.addToLibrary(curator1);

      await cardRepository.save(card1);
      await cardRepository.save(card2);

      // Search for "machine neural" - should only match card1
      const result = await queryRepository.searchUrls({
        searchQuery: 'machine neural',
        page: 1,
        limit: 10,
        sortBy: CardSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]!.url).toBe(url1.value);
    });

    it('should use substring matching, not full word matching', async () => {
      const url1 = URL.create('https://example.com/article').unwrap();
      const metadata1 = UrlMetadata.create({
        url: url1.value,
        title: 'Understanding Programming',
        description: 'A guide',
      }).unwrap();

      const card1 = new CardBuilder()
        .withCuratorId(curator1.value)
        .withUrlCard(url1, metadata1)
        .buildOrThrow();

      card1.addToLibrary(curator1);
      await cardRepository.save(card1);

      // Search for "program" - should match "Programming" via substring
      const result = await queryRepository.searchUrls({
        searchQuery: 'program',
        page: 1,
        limit: 10,
        sortBy: CardSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]!.url).toBe(url1.value);
    });
  });

  describe('URL deduplication', () => {
    it('should deduplicate same URL from different users and return most recent', async () => {
      const sharedUrl = URL.create('https://example.com/shared').unwrap();

      // Curator 1 creates card first (older)
      const metadata1 = UrlMetadata.create({
        url: sharedUrl.value,
        title: 'Shared Article',
        description: 'Version 1',
      }).unwrap();

      const card1 = new CardBuilder()
        .withCuratorId(curator1.value)
        .withUrlCard(sharedUrl, metadata1)
        .withCreatedAt(new Date('2023-01-01'))
        .withUpdatedAt(new Date('2023-01-01'))
        .buildOrThrow();

      card1.addToLibrary(curator1);
      await cardRepository.save(card1);

      // Wait a bit to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Curator 2 creates card with same URL (newer)
      const metadata2 = UrlMetadata.create({
        url: sharedUrl.value,
        title: 'Shared Article',
        description: 'Version 2 - Updated',
      }).unwrap();

      const card2 = new CardBuilder()
        .withCuratorId(curator2.value)
        .withUrlCard(sharedUrl, metadata2)
        .withCreatedAt(new Date('2023-01-02'))
        .withUpdatedAt(new Date('2023-01-02'))
        .buildOrThrow();

      card2.addToLibrary(curator2);
      await cardRepository.save(card2);

      const result = await queryRepository.searchUrls({
        searchQuery: 'shared',
        page: 1,
        limit: 10,
        sortBy: CardSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
      });

      // Should return only one URL (deduplicated)
      expect(result.items).toHaveLength(1);
      expect(result.items[0]!.url).toBe(sharedUrl.value);
      // Should have the newer metadata
      expect(result.items[0]!.contentData.metadata.description).toBe(
        'Version 2 - Updated',
      );
      expect(result.totalCount).toBe(1);
    });
  });

  describe('URL type filtering', () => {
    it('should filter by URL type when specified', async () => {
      const articleUrl = URL.create('https://example.com/article').unwrap();
      const articleMetadata = UrlMetadata.create({
        url: articleUrl.value,
        title: 'Test Article',
        description: 'An article',
        type: UrlType.ARTICLE,
      }).unwrap();

      const videoUrl = URL.create('https://example.com/video').unwrap();
      const videoMetadata = UrlMetadata.create({
        url: videoUrl.value,
        title: 'Test Video',
        description: 'A video',
        type: UrlType.VIDEO,
      }).unwrap();

      const articleCard = new CardBuilder()
        .withCuratorId(curator1.value)
        .withUrlCard(articleUrl, articleMetadata)
        .buildOrThrow();

      const videoCard = new CardBuilder()
        .withCuratorId(curator1.value)
        .withUrlCard(videoUrl, videoMetadata)
        .buildOrThrow();

      articleCard.addToLibrary(curator1);
      videoCard.addToLibrary(curator1);

      await cardRepository.save(articleCard);
      await cardRepository.save(videoCard);

      // Search for articles only
      const articleResult = await queryRepository.searchUrls({
        searchQuery: 'test',
        page: 1,
        limit: 10,
        sortBy: CardSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
        urlType: UrlType.ARTICLE,
      });

      expect(articleResult.items).toHaveLength(1);
      expect(articleResult.items[0]!.url).toBe(articleUrl.value);

      // Search for videos only
      const videoResult = await queryRepository.searchUrls({
        searchQuery: 'test',
        page: 1,
        limit: 10,
        sortBy: CardSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
        urlType: UrlType.VIDEO,
      });

      expect(videoResult.items).toHaveLength(1);
      expect(videoResult.items[0]!.url).toBe(videoUrl.value);
    });
  });

  describe('Sorting', () => {
    it('should sort by updated date descending', async () => {
      const url1 = URL.create('https://example.com/old').unwrap();
      const metadata1 = UrlMetadata.create({
        url: url1.value,
        title: 'Old Article',
        description: 'Test',
      }).unwrap();

      const url2 = URL.create('https://example.com/new').unwrap();
      const metadata2 = UrlMetadata.create({
        url: url2.value,
        title: 'New Article',
        description: 'Test',
      }).unwrap();

      const card1 = new CardBuilder()
        .withCuratorId(curator1.value)
        .withUrlCard(url1, metadata1)
        .withUpdatedAt(new Date('2023-01-01'))
        .buildOrThrow();

      const card2 = new CardBuilder()
        .withCuratorId(curator1.value)
        .withUrlCard(url2, metadata2)
        .withUpdatedAt(new Date('2023-01-02'))
        .buildOrThrow();

      card1.addToLibrary(curator1);
      card2.addToLibrary(curator1);

      await cardRepository.save(card1);
      await cardRepository.save(card2);

      const result = await queryRepository.searchUrls({
        searchQuery: 'article',
        page: 1,
        limit: 10,
        sortBy: CardSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
      });

      expect(result.items).toHaveLength(2);
      expect(result.items[0]!.url).toBe(url2.value); // Newer first
      expect(result.items[1]!.url).toBe(url1.value);
    });

    it('should sort by updated date ascending', async () => {
      const url1 = URL.create('https://example.com/old').unwrap();
      const metadata1 = UrlMetadata.create({
        url: url1.value,
        title: 'Old Article',
        description: 'Test',
      }).unwrap();

      const url2 = URL.create('https://example.com/new').unwrap();
      const metadata2 = UrlMetadata.create({
        url: url2.value,
        title: 'New Article',
        description: 'Test',
      }).unwrap();

      const card1 = new CardBuilder()
        .withCuratorId(curator1.value)
        .withUrlCard(url1, metadata1)
        .withUpdatedAt(new Date('2023-01-01'))
        .buildOrThrow();

      const card2 = new CardBuilder()
        .withCuratorId(curator1.value)
        .withUrlCard(url2, metadata2)
        .withUpdatedAt(new Date('2023-01-02'))
        .buildOrThrow();

      card1.addToLibrary(curator1);
      card2.addToLibrary(curator1);

      await cardRepository.save(card1);
      await cardRepository.save(card2);

      const result = await queryRepository.searchUrls({
        searchQuery: 'article',
        page: 1,
        limit: 10,
        sortBy: CardSortField.UPDATED_AT,
        sortOrder: SortOrder.ASC,
      });

      expect(result.items).toHaveLength(2);
      expect(result.items[0]!.url).toBe(url1.value); // Older first
      expect(result.items[1]!.url).toBe(url2.value);
    });
  });

  describe('Pagination', () => {
    it('should paginate results correctly', async () => {
      // Create 5 cards
      for (let i = 1; i <= 5; i++) {
        const url = URL.create(`https://example.com/article${i}`).unwrap();
        const metadata = UrlMetadata.create({
          url: url.value,
          title: `Article ${i}`,
          description: 'Test article',
        }).unwrap();

        const card = new CardBuilder()
          .withCuratorId(curator1.value)
          .withUrlCard(url, metadata)
          .buildOrThrow();

        card.addToLibrary(curator1);
        await cardRepository.save(card);
      }

      // First page with limit 2
      const page1 = await queryRepository.searchUrls({
        searchQuery: 'article',
        page: 1,
        limit: 2,
        sortBy: CardSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
      });

      expect(page1.items).toHaveLength(2);
      expect(page1.totalCount).toBe(5);
      expect(page1.hasMore).toBe(true);

      // Second page
      const page2 = await queryRepository.searchUrls({
        searchQuery: 'article',
        page: 2,
        limit: 2,
        sortBy: CardSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
      });

      expect(page2.items).toHaveLength(2);
      expect(page2.totalCount).toBe(5);
      expect(page2.hasMore).toBe(true);

      // Third page (last page with 1 item)
      const page3 = await queryRepository.searchUrls({
        searchQuery: 'article',
        page: 3,
        limit: 2,
        sortBy: CardSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
      });

      expect(page3.items).toHaveLength(1);
      expect(page3.totalCount).toBe(5);
      expect(page3.hasMore).toBe(false);
    });
  });

  describe('Empty results', () => {
    it('should return empty results when no matches found', async () => {
      const url1 = URL.create('https://example.com/article').unwrap();
      const metadata1 = UrlMetadata.create({
        url: url1.value,
        title: 'Test Article',
        description: 'A test',
      }).unwrap();

      const card1 = new CardBuilder()
        .withCuratorId(curator1.value)
        .withUrlCard(url1, metadata1)
        .buildOrThrow();

      card1.addToLibrary(curator1);
      await cardRepository.save(card1);

      const result = await queryRepository.searchUrls({
        searchQuery: 'nonexistent',
        page: 1,
        limit: 10,
        sortBy: CardSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
      });

      expect(result.items).toHaveLength(0);
      expect(result.totalCount).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('should return empty results when no cards exist', async () => {
      const result = await queryRepository.searchUrls({
        searchQuery: 'anything',
        page: 1,
        limit: 10,
        sortBy: CardSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
      });

      expect(result.items).toHaveLength(0);
      expect(result.totalCount).toBe(0);
      expect(result.hasMore).toBe(false);
    });
  });

  describe('Case insensitive search', () => {
    it('should match regardless of case', async () => {
      const url1 = URL.create('https://example.com/article').unwrap();
      const metadata1 = UrlMetadata.create({
        url: url1.value,
        title: 'UPPERCASE TITLE',
        description: 'lowercase description',
      }).unwrap();

      const card1 = new CardBuilder()
        .withCuratorId(curator1.value)
        .withUrlCard(url1, metadata1)
        .buildOrThrow();

      card1.addToLibrary(curator1);
      await cardRepository.save(card1);

      // Search with lowercase
      const result1 = await queryRepository.searchUrls({
        searchQuery: 'uppercase',
        page: 1,
        limit: 10,
        sortBy: CardSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
      });

      expect(result1.items).toHaveLength(1);

      // Search with mixed case
      const result2 = await queryRepository.searchUrls({
        searchQuery: 'LOWERCASE',
        page: 1,
        limit: 10,
        sortBy: CardSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
      });

      expect(result2.items).toHaveLength(1);
    });
  });
});
