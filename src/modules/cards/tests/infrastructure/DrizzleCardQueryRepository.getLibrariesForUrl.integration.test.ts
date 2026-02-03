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
import { CardSortField, SortOrder } from '../../domain/ICardQueryRepository';
import { createTestSchema } from '../test-utils/createTestSchema';
import { CardTypeEnum } from '../../domain/value-objects/CardType';
import { PublishedRecordId } from '../../domain/value-objects/PublishedRecordId';

describe('DrizzleCardQueryRepository - getLibrariesForUrl', () => {
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

  describe('getLibrariesForUrl', () => {
    it('should return all users who have cards with the specified URL', async () => {
      const testUrl = 'https://example.com/shared-article';
      const url = URL.create(testUrl).unwrap();

      // Create URL cards for different users with the same URL
      const card1 = new CardBuilder()
        .withCuratorId(curator1.value)
        .withType(CardTypeEnum.URL)
        .withUrl(url)
        .buildOrThrow();

      const card2 = new CardBuilder()
        .withCuratorId(curator2.value)
        .withType(CardTypeEnum.URL)
        .withUrl(url)
        .buildOrThrow();

      const card3 = new CardBuilder()
        .withCuratorId(curator3.value)
        .withType(CardTypeEnum.URL)
        .withUrl(url)
        .buildOrThrow();

      // Add cards to their respective libraries
      card1.addToLibrary(curator1);
      card2.addToLibrary(curator2);
      card3.addToLibrary(curator3);

      // Save cards
      await cardRepository.save(card1);
      await cardRepository.save(card2);
      await cardRepository.save(card3);

      // Execute the query
      const result = await queryRepository.getLibrariesForUrl(testUrl, {
        page: 1,
        limit: 10,
        sortBy: CardSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
      });

      // Verify the result
      expect(result.items).toHaveLength(3);
      expect(result.totalCount).toBe(3);
      expect(result.hasMore).toBe(false);

      // Check that all three users are included
      const userIds = result.items.map((lib) => lib.userId);
      expect(userIds).toContain(curator1.value);
      expect(userIds).toContain(curator2.value);
      expect(userIds).toContain(curator3.value);

      // Check that card IDs are correct
      const cardIds = result.items.map((lib) => lib.card.id);
      expect(cardIds).toContain(card1.cardId.getStringValue());
      expect(cardIds).toContain(card2.cardId.getStringValue());
      expect(cardIds).toContain(card3.cardId.getStringValue());
    });

    it('should return empty result when no users have cards with the specified URL', async () => {
      const testUrl = 'https://example.com/nonexistent-article';

      const result = await queryRepository.getLibrariesForUrl(testUrl, {
        page: 1,
        limit: 10,
        sortBy: CardSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
      });

      expect(result.items).toHaveLength(0);
      expect(result.totalCount).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('should not return users who have different URLs', async () => {
      const testUrl1 = 'https://example.com/article1';
      const testUrl2 = 'https://example.com/article2';
      const url1 = URL.create(testUrl1).unwrap();
      const url2 = URL.create(testUrl2).unwrap();

      // Create cards with different URLs
      const card1 = new CardBuilder()
        .withCuratorId(curator1.value)
        .withType(CardTypeEnum.URL)
        .withUrl(url1)
        .buildOrThrow();

      const card2 = new CardBuilder()
        .withCuratorId(curator2.value)
        .withType(CardTypeEnum.URL)
        .withUrl(url2)
        .buildOrThrow();

      card1.addToLibrary(curator1);
      card2.addToLibrary(curator2);

      await cardRepository.save(card1);
      await cardRepository.save(card2);

      // Query for testUrl1
      const result = await queryRepository.getLibrariesForUrl(testUrl1, {
        page: 1,
        limit: 10,
        sortBy: CardSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]!.userId).toBe(curator1.value);
      expect(result.items[0]!.card.id).toBe(card1.cardId.getStringValue());
    });

    it('should not return NOTE cards even if they have the same URL', async () => {
      const testUrl = 'https://example.com/article';
      const url = URL.create(testUrl).unwrap();

      // Create URL card
      const urlCard = new CardBuilder()
        .withCuratorId(curator1.value)
        .withType(CardTypeEnum.URL)
        .withUrl(url)
        .buildOrThrow();

      // Create NOTE card with same URL (shouldn't happen in practice but test edge case)
      const noteCard = new CardBuilder()
        .withCuratorId(curator2.value)
        .withType(CardTypeEnum.NOTE)
        .withUrl(url)
        .buildOrThrow();

      urlCard.addToLibrary(curator1);
      noteCard.addToLibrary(curator2);

      await cardRepository.save(urlCard);
      await cardRepository.save(noteCard);

      const result = await queryRepository.getLibrariesForUrl(testUrl, {
        page: 1,
        limit: 10,
        sortBy: CardSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
      });

      // Should only return the URL card, not the NOTE card
      expect(result.items).toHaveLength(1);
      expect(result.items[0]!.userId).toBe(curator1.value);
      expect(result.items[0]!.card.id).toBe(urlCard.cardId.getStringValue());
    });

    it('should handle multiple cards from same user with same URL', async () => {
      const testUrl = 'https://example.com/article';
      const url = URL.create(testUrl).unwrap();

      // Create two URL cards from same user with same URL
      const card1 = new CardBuilder()
        .withCuratorId(curator1.value)
        .withType(CardTypeEnum.URL)
        .withUrl(url)
        .buildOrThrow();

      const card2 = new CardBuilder()
        .withCuratorId(curator1.value)
        .withType(CardTypeEnum.URL)
        .withUrl(url)
        .buildOrThrow();

      card1.addToLibrary(curator1);
      card2.addToLibrary(curator1);

      await cardRepository.save(card1);
      await cardRepository.save(card2);

      const result = await queryRepository.getLibrariesForUrl(testUrl, {
        page: 1,
        limit: 10,
        sortBy: CardSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
      });

      // Should return both cards
      expect(result.items).toHaveLength(2);
      expect(result.totalCount).toBe(2);

      // Both should be from the same user
      expect(result.items[0]!.userId).toBe(curator1.value);
      expect(result.items[1]!.userId).toBe(curator1.value);

      // But different card IDs
      const cardIds = result.items.map((lib) => lib.card.id);
      expect(cardIds).toContain(card1.cardId.getStringValue());
      expect(cardIds).toContain(card2.cardId.getStringValue());
    });

    it('should handle cards not in any library', async () => {
      const testUrl = 'https://example.com/article';
      const url = URL.create(testUrl).unwrap();

      // Create URL card but don't add to library
      const card = new CardBuilder()
        .withCuratorId(curator1.value)
        .withType(CardTypeEnum.URL)
        .withUrl(url)
        .buildOrThrow();

      await cardRepository.save(card);

      const result = await queryRepository.getLibrariesForUrl(testUrl, {
        page: 1,
        limit: 10,
        sortBy: CardSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
      });

      // Should return empty since card is not in any library
      expect(result.items).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });
  });

  describe('sorting', () => {
    it('should sort by createdAt in descending order by default', async () => {
      const testUrl = 'https://example.com/sort-test';
      const url = URL.create(testUrl).unwrap();

      // Create cards with different creation times
      const card1 = new CardBuilder()
        .withCuratorId(curator1.value)
        .withType(CardTypeEnum.URL)
        .withUrl(url)
        .buildOrThrow();

      await new Promise((resolve) => setTimeout(resolve, 1000));
      const card2 = new CardBuilder()
        .withCuratorId(curator2.value)
        .withType(CardTypeEnum.URL)
        .withUrl(url)
        .buildOrThrow();

      await new Promise((resolve) => setTimeout(resolve, 1000));
      const card3 = new CardBuilder()
        .withCuratorId(curator3.value)
        .withType(CardTypeEnum.URL)
        .withUrl(url)
        .buildOrThrow();

      card1.addToLibrary(curator1);
      card2.addToLibrary(curator2);
      card3.addToLibrary(curator3);

      // Save cards with slight delays to ensure different timestamps
      await cardRepository.save(card1);
      await new Promise((resolve) => setTimeout(resolve, 10));
      await cardRepository.save(card2);
      await new Promise((resolve) => setTimeout(resolve, 10));
      await cardRepository.save(card3);

      const result = await queryRepository.getLibrariesForUrl(testUrl, {
        page: 1,
        limit: 10,
        sortBy: CardSortField.CREATED_AT,
        sortOrder: SortOrder.DESC,
      });

      expect(result.items).toHaveLength(3);

      // Should be sorted by creation time, newest first
      const cardIds = result.items.map((lib) => lib.card.id);
      expect(cardIds[0]).toBe(card3.cardId.getStringValue()); // Most recent
      expect(cardIds[1]).toBe(card2.cardId.getStringValue()); // Middle
      expect(cardIds[2]).toBe(card1.cardId.getStringValue()); // Oldest
    });

    it('should sort by createdAt in ascending order when specified', async () => {
      const testUrl = 'https://example.com/sort-asc-test';
      const url = URL.create(testUrl).unwrap();

      // Create cards with different creation times
      const card1 = new CardBuilder()
        .withCuratorId(curator1.value)
        .withType(CardTypeEnum.URL)
        .withUrl(url)
        .buildOrThrow();

      const card2 = new CardBuilder()
        .withCuratorId(curator2.value)
        .withType(CardTypeEnum.URL)
        .withUrl(url)
        .buildOrThrow();

      card1.addToLibrary(curator1);
      card2.addToLibrary(curator2);

      // Save cards with slight delay to ensure different timestamps
      await cardRepository.save(card1);
      await new Promise((resolve) => setTimeout(resolve, 10));
      await cardRepository.save(card2);

      const result = await queryRepository.getLibrariesForUrl(testUrl, {
        page: 1,
        limit: 10,
        sortBy: CardSortField.CREATED_AT,
        sortOrder: SortOrder.ASC,
      });

      expect(result.items).toHaveLength(2);

      // Should be sorted by creation time, oldest first
      const cardIds = result.items.map((lib) => lib.card.id);
      expect(cardIds[0]).toBe(card1.cardId.getStringValue()); // Oldest
      expect(cardIds[1]).toBe(card2.cardId.getStringValue()); // Newest
    });

    it('should sort by libraryCount in descending order', async () => {
      const testUrl = 'https://example.com/sort-library-count-test';
      const url = URL.create(testUrl).unwrap();

      // Create cards
      const card1 = new CardBuilder()
        .withCuratorId(curator1.value)
        .withType(CardTypeEnum.URL)
        .withUrl(url)
        .buildOrThrow();

      const card2 = new CardBuilder()
        .withCuratorId(curator2.value)
        .withType(CardTypeEnum.URL)
        .withUrl(url)
        .buildOrThrow();

      const card3 = new CardBuilder()
        .withCuratorId(curator3.value)
        .withType(CardTypeEnum.URL)
        .withUrl(url)
        .buildOrThrow();

      // Add cards to libraries with different counts
      card1.addToLibrary(curator1);

      card2.addToLibrary(curator2);
      card2.addToLibrary(curator1); // card2 has 2 library memberships

      card3.addToLibrary(curator3);
      card3.addToLibrary(curator1); // card3 has 3 library memberships
      card3.addToLibrary(curator2);

      await cardRepository.save(card1);
      await cardRepository.save(card2);
      await cardRepository.save(card3);

      const result = await queryRepository.getLibrariesForUrl(testUrl, {
        page: 1,
        limit: 10,
        sortBy: CardSortField.LIBRARY_COUNT,
        sortOrder: SortOrder.DESC,
      });

      // Should return all library memberships, but sorted by the card's library count
      expect(result.items.length).toBeGreaterThan(0);

      // Group by card ID to check sorting
      const cardGroups = new Map<string, any[]>();
      result.items.forEach((item) => {
        const cardId = item.card.id;
        if (!cardGroups.has(cardId)) {
          cardGroups.set(cardId, []);
        }
        cardGroups.get(cardId)!.push(item);
      });

      // Get the first occurrence of each card to check library count ordering
      const uniqueCards = Array.from(cardGroups.entries()).map(
        ([cardId, items]) => ({
          cardId,
          libraryCount: items[0]!.card.libraryCount,
        }),
      );

      // Should be sorted by library count descending
      for (let i = 0; i < uniqueCards.length - 1; i++) {
        expect(uniqueCards[i]!.libraryCount).toBeGreaterThanOrEqual(
          uniqueCards[i + 1]!.libraryCount,
        );
      }
    });

    it('should sort by libraryCount in ascending order when specified', async () => {
      const testUrl = 'https://example.com/sort-library-count-asc-test';
      const url = URL.create(testUrl).unwrap();

      // Create cards with different library counts
      const card1 = new CardBuilder()
        .withCuratorId(curator1.value)
        .withType(CardTypeEnum.URL)
        .withUrl(url)
        .buildOrThrow();

      const card2 = new CardBuilder()
        .withCuratorId(curator2.value)
        .withType(CardTypeEnum.URL)
        .withUrl(url)
        .buildOrThrow();

      // card1 has 1 library membership, card2 has 2
      card1.addToLibrary(curator1);
      card2.addToLibrary(curator2);
      card2.addToLibrary(curator1);

      await cardRepository.save(card1);
      await cardRepository.save(card2);

      const result = await queryRepository.getLibrariesForUrl(testUrl, {
        page: 1,
        limit: 10,
        sortBy: CardSortField.LIBRARY_COUNT,
        sortOrder: SortOrder.ASC,
      });

      expect(result.items.length).toBeGreaterThan(0);

      // Group by card ID and check ascending order
      const cardGroups = new Map<string, any[]>();
      result.items.forEach((item) => {
        const cardId = item.card.id;
        if (!cardGroups.has(cardId)) {
          cardGroups.set(cardId, []);
        }
        cardGroups.get(cardId)!.push(item);
      });

      const uniqueCards = Array.from(cardGroups.entries()).map(
        ([cardId, items]) => ({
          cardId,
          libraryCount: items[0]!.card.libraryCount,
        }),
      );

      // Should be sorted by library count ascending
      for (let i = 0; i < uniqueCards.length - 1; i++) {
        expect(uniqueCards[i]!.libraryCount).toBeLessThanOrEqual(
          uniqueCards[i + 1]!.libraryCount,
        );
      }
    });
  });

  describe('pagination', () => {
    it('should paginate results correctly', async () => {
      const testUrl = 'https://example.com/popular-article';
      const url = URL.create(testUrl).unwrap();

      // Create 5 cards with the same URL from different users
      const cards = [];
      const curators = [];
      for (let i = 1; i <= 5; i++) {
        const curator = CuratorId.create(`did:plc:curator${i}`).unwrap();
        curators.push(curator);

        const card = new CardBuilder()
          .withCuratorId(curator.value)
          .withType(CardTypeEnum.URL)
          .withUrl(url)
          .buildOrThrow();

        card.addToLibrary(curator);
        cards.push(card);
        await cardRepository.save(card);
      }

      // Test first page with limit 2
      const result1 = await queryRepository.getLibrariesForUrl(testUrl, {
        page: 1,
        limit: 2,
        sortBy: CardSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
      });

      expect(result1.items).toHaveLength(2);
      expect(result1.totalCount).toBe(5);
      expect(result1.hasMore).toBe(true);

      // Test second page
      const result2 = await queryRepository.getLibrariesForUrl(testUrl, {
        page: 2,
        limit: 2,
        sortBy: CardSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
      });

      expect(result2.items).toHaveLength(2);
      expect(result2.totalCount).toBe(5);
      expect(result2.hasMore).toBe(true);

      // Test last page
      const result3 = await queryRepository.getLibrariesForUrl(testUrl, {
        page: 3,
        limit: 2,
        sortBy: CardSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
      });

      expect(result3.items).toHaveLength(1);
      expect(result3.totalCount).toBe(5);
      expect(result3.hasMore).toBe(false);

      // Verify no duplicate entries across pages
      const allUserIds = [
        ...result1.items.map((lib) => lib.userId),
        ...result2.items.map((lib) => lib.userId),
        ...result3.items.map((lib) => lib.userId),
      ];
      const uniqueUserIds = [...new Set(allUserIds)];
      expect(uniqueUserIds).toHaveLength(5);
    });

    it('should handle empty pages correctly', async () => {
      const testUrl = 'https://example.com/empty-test';

      const result = await queryRepository.getLibrariesForUrl(testUrl, {
        page: 2,
        limit: 10,
        sortBy: CardSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
      });

      expect(result.items).toHaveLength(0);
      expect(result.totalCount).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('should handle large page numbers gracefully', async () => {
      const testUrl = 'https://example.com/single-card';
      const url = URL.create(testUrl).unwrap();

      // Create single card
      const card = new CardBuilder()
        .withCuratorId(curator1.value)
        .withType(CardTypeEnum.URL)
        .withUrl(url)
        .buildOrThrow();

      card.addToLibrary(curator1);
      await cardRepository.save(card);

      // Request page 10 when there's only 1 item
      const result = await queryRepository.getLibrariesForUrl(testUrl, {
        page: 10,
        limit: 10,
        sortBy: CardSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
      });

      expect(result.items).toHaveLength(0);
      expect(result.totalCount).toBe(1);
      expect(result.hasMore).toBe(false);
    });
  });
});
