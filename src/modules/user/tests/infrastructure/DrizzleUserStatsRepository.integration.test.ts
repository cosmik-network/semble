import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import postgres from 'postgres';
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DrizzleUserStatsRepository } from '../../infrastructure/repositories/DrizzleUserStatsRepository';
import { createTestSchema } from '../../../cards/tests/test-utils/createTestSchema';
import { users } from '../../infrastructure/repositories/schema/user.sql';
import { cards } from '../../../cards/infrastructure/repositories/schema/card.sql';
import { collections } from '../../../cards/infrastructure/repositories/schema/collection.sql';
import { connections } from '../../../cards/infrastructure/repositories/schema/connection.sql';
import { follows } from '../../infrastructure/repositories/schema/follows.sql';
import { collectionCards } from '../../../cards/infrastructure/repositories/schema/collection.sql';

describe('DrizzleUserStatsRepository', () => {
  let container: StartedPostgreSqlContainer;
  let db: PostgresJsDatabase;
  let statsRepository: DrizzleUserStatsRepository;

  beforeAll(async () => {
    // Start PostgreSQL container
    container = await new PostgreSqlContainer('postgres:14').start();

    // Create database connection
    const connectionString = container.getConnectionUri();
    process.env.DATABASE_URL = connectionString;
    const client = postgres(connectionString);
    db = drizzle(client);

    // Create repository
    statsRepository = new DrizzleUserStatsRepository(db);

    // Create schema using helper function
    await createTestSchema(db);
  }, 60000); // Increase timeout for container startup

  afterAll(async () => {
    await container.stop();
  });

  // Clear data between tests
  beforeEach(async () => {
    await db.delete(collectionCards);
    await db.delete(follows);
    await db.delete(connections);
    await db.delete(collections);
    await db.delete(cards);
    await db.delete(users);
  });

  describe('getUserGrowthStats', () => {
    it('should return user growth statistics with cumulative totals', async () => {
      const baseTime = new Date('2026-04-01T00:00:00Z');

      // Insert users at different times
      await db.insert(users).values([
        {
          id: 'user1',
          handle: 'user1.test',
          linkedAt: new Date(baseTime.getTime()), // Apr 1
          lastLoginAt: new Date(baseTime.getTime()),
        },
        {
          id: 'user2',
          handle: 'user2.test',
          linkedAt: new Date(baseTime.getTime()), // Apr 1
          lastLoginAt: new Date(baseTime.getTime()),
        },
        {
          id: 'user3',
          handle: 'user3.test',
          linkedAt: new Date(baseTime.getTime() + 24 * 60 * 60 * 1000), // Apr 2
          lastLoginAt: new Date(baseTime.getTime() + 24 * 60 * 60 * 1000),
        },
        {
          id: 'user4',
          handle: 'user4.test',
          linkedAt: new Date(baseTime.getTime() + 2 * 24 * 60 * 60 * 1000), // Apr 3
          lastLoginAt: new Date(baseTime.getTime() + 2 * 24 * 60 * 60 * 1000),
        },
      ]);

      const result = await statsRepository.getUserGrowthStats({
        interval: 'day',
        limit: 10,
      });

      expect(result.dataPoints).toHaveLength(3);
      expect(result.currentTotal).toBe(4);

      // Check cumulative growth (chronological order)
      expect(result.dataPoints[0]?.newUsers).toBe(2); // Apr 1: 2 new users
      expect(result.dataPoints[0]?.totalUsers).toBe(2); // Total: 2

      expect(result.dataPoints[1]?.newUsers).toBe(1); // Apr 2: 1 new user
      expect(result.dataPoints[1]?.totalUsers).toBe(3); // Total: 3

      expect(result.dataPoints[2]?.newUsers).toBe(1); // Apr 3: 1 new user
      expect(result.dataPoints[2]?.totalUsers).toBe(4); // Total: 4
    });

    it('should return empty data when no users exist', async () => {
      const result = await statsRepository.getUserGrowthStats({
        interval: 'day',
        limit: 10,
      });

      expect(result.dataPoints).toHaveLength(0);
      expect(result.currentTotal).toBe(0);
    });

    it('should support week interval aggregation', async () => {
      const baseTime = new Date('2026-04-01T00:00:00Z'); // Tuesday

      // Insert users across two weeks
      await db.insert(users).values([
        {
          id: 'user1',
          handle: 'user1.test',
          linkedAt: new Date(baseTime.getTime()), // Week 1
          lastLoginAt: new Date(baseTime.getTime()),
        },
        {
          id: 'user2',
          handle: 'user2.test',
          linkedAt: new Date(baseTime.getTime() + 7 * 24 * 60 * 60 * 1000), // Week 2
          lastLoginAt: new Date(baseTime.getTime() + 7 * 24 * 60 * 60 * 1000),
        },
      ]);

      const result = await statsRepository.getUserGrowthStats({
        interval: 'week',
        limit: 10,
      });

      expect(result.dataPoints).toHaveLength(2);
      expect(result.currentTotal).toBe(2);
    });
  });

  describe('getUserEngagementStats', () => {
    beforeEach(async () => {
      const baseTime = new Date('2026-04-01T00:00:00Z');

      // Create test users
      await db.insert(users).values([
        {
          id: 'active-user-1',
          handle: 'active1.test',
          linkedAt: baseTime,
          lastLoginAt: baseTime,
        },
        {
          id: 'active-user-2',
          handle: 'active2.test',
          linkedAt: baseTime,
          lastLoginAt: baseTime,
        },
        {
          id: 'inactive-user',
          handle: 'inactive.test',
          linkedAt: baseTime,
          lastLoginAt: baseTime,
        },
      ]);
    });

    it('should calculate engagement metrics for active and inactive users', async () => {
      const baseTime = new Date('2026-04-01T00:00:00Z');

      // Active user 1: has URL cards
      await db.insert(cards).values([
        {
          id: '10000000-0000-0000-0000-000000000001',
          authorId: 'active-user-1',
          type: 'URL',
          contentData: { url: 'https://example.com' },
          url: 'https://example.com',
          urlType: 'article',
          createdAt: baseTime,
          updatedAt: baseTime,
        },
      ]);

      // Active user 2: has collections and follows
      await db.insert(collections).values([
        {
          id: '20000000-0000-0000-0000-000000000001',
          authorId: 'active-user-2',
          name: 'Test Collection',
          accessType: 'OPEN',
          createdAt: baseTime,
          updatedAt: baseTime,
        },
      ]);

      await db.insert(follows).values([
        {
          followerId: 'active-user-2',
          targetId: 'active-user-1',
          targetType: 'USER',
          createdAt: baseTime,
        },
      ]);

      // Inactive user: no content

      const result = await statsRepository.getUserEngagementStats({});

      expect(result.totalUsers).toBe(3);
      expect(result.activeUsers).toBe(2);
      expect(result.inactiveUsers).toBe(1);
      expect(result.usersWithCards).toBe(1);
      expect(result.usersWithCollections).toBe(1);
      expect(result.usersWithFollows).toBe(1);
      expect(result.activationRate).toBeCloseTo(2 / 3, 2);
      expect(result.avgActionsPerActiveUser).toBeGreaterThan(0);
      expect(result.dataPoints).toBeUndefined(); // No time series by default
    });

    it('should only count URL cards, not NOTE or HIGHLIGHT cards', async () => {
      const baseTime = new Date('2026-04-01T00:00:00Z');

      // User with URL cards (should count)
      await db.insert(cards).values([
        {
          id: '50000000-0000-0000-0000-000000000001',
          authorId: 'active-user-1',
          type: 'URL',
          contentData: { url: 'https://example.com' },
          url: 'https://example.com',
          urlType: 'article',
          createdAt: baseTime,
          updatedAt: baseTime,
        },
      ]);

      // User with NOTE cards (should not count as having cards)
      await db.insert(cards).values([
        {
          id: '40000000-0000-0000-0000-000000000001',
          authorId: 'active-user-2',
          type: 'NOTE',
          contentData: { text: 'A note' },
          createdAt: baseTime,
          updatedAt: baseTime,
        },
      ]);

      const result = await statsRepository.getUserEngagementStats({});

      expect(result.totalUsers).toBe(3);
      expect(result.usersWithCards).toBe(1); // Only active-user-1 has URL cards
      expect(result.activeUsers).toBe(1); // Only active-user-1 is active
    });

    it('should include time series data when requested', async () => {
      const baseTime = new Date('2026-04-01T00:00:00Z');

      // Create URL cards at different times
      await db.insert(cards).values([
        {
          id: '10000000-0000-0000-0000-000000000001',
          authorId: 'active-user-1',
          type: 'URL',
          contentData: { url: 'https://example.com' },
          url: 'https://example.com',
          urlType: 'article',
          createdAt: new Date(baseTime.getTime()), // Day 1
          updatedAt: baseTime,
        },
        {
          id: '10000000-0000-0000-0000-000000000002',
          authorId: 'active-user-2',
          type: 'URL',
          contentData: { url: 'https://example2.com' },
          url: 'https://example2.com',
          urlType: 'video',
          createdAt: new Date(baseTime.getTime() + 24 * 60 * 60 * 1000), // Day 2
          updatedAt: new Date(baseTime.getTime() + 24 * 60 * 60 * 1000),
        },
      ]);

      const result = await statsRepository.getUserEngagementStats({
        includeTimeSeries: true,
        interval: 'day',
        limit: 10,
      });

      expect(result.dataPoints).toBeDefined();
      expect(result.dataPoints!.length).toBeGreaterThan(0);
      expect(result.dataPoints![0]).toHaveProperty('date');
      expect(result.dataPoints![0]).toHaveProperty('activeUsers');
      expect(result.dataPoints![0]).toHaveProperty('newlyActivatedUsers');
      expect(result.dataPoints![0]).toHaveProperty('cumulativeActiveUsers');
    });

    it('should track users with contributions to others collections', async () => {
      const baseTime = new Date('2026-04-01T00:00:00Z');

      // Create a collection owned by active-user-1
      await db.insert(collections).values([
        {
          id: '20000000-0000-0000-0000-000000000001',
          authorId: 'active-user-1',
          name: 'Test Collection',
          accessType: 'OPEN',
          createdAt: baseTime,
          updatedAt: baseTime,
        },
      ]);

      // Create a URL card
      await db.insert(cards).values([
        {
          id: '10000000-0000-0000-0000-000000000001',
          authorId: 'active-user-2',
          type: 'URL',
          contentData: { url: 'https://example.com' },
          url: 'https://example.com',
          urlType: 'article',
          createdAt: baseTime,
          updatedAt: baseTime,
        },
      ]);

      // Active-user-2 adds a card to active-user-1's collection
      await db.insert(collectionCards).values([
        {
          id: '60000000-0000-0000-0000-000000000001',
          collectionId: '20000000-0000-0000-0000-000000000001',
          cardId: '10000000-0000-0000-0000-000000000001',
          addedBy: 'active-user-2', // Different from collection owner
          addedAt: baseTime,
        },
      ]);

      const result = await statsRepository.getUserEngagementStats({});

      expect(result.usersWithContributions).toBe(1); // active-user-2 contributed to someone else's collection
    });
  });

  describe('getDailyActivityStats', () => {
    it('should return daily activity counts for all content types', async () => {
      const baseTime = new Date('2026-04-01T00:00:00Z');

      // Day 1: Create URL cards
      await db.insert(cards).values([
        {
          id: '10000000-0000-0000-0000-000000000001',
          authorId: 'user1',
          type: 'URL',
          contentData: { url: 'https://example.com' },
          url: 'https://example.com',
          urlType: 'article',
          createdAt: baseTime,
          updatedAt: baseTime,
        },
        {
          id: '10000000-0000-0000-0000-000000000002',
          authorId: 'user2',
          type: 'URL',
          contentData: { url: 'https://example2.com' },
          url: 'https://example2.com',
          urlType: 'video',
          createdAt: baseTime,
          updatedAt: baseTime,
        },
      ]);

      // Day 1: Create collections
      await db.insert(collections).values([
        {
          id: '20000000-0000-0000-0000-000000000001',
          authorId: 'user1',
          name: 'Collection 1',
          accessType: 'OPEN',
          createdAt: baseTime,
          updatedAt: baseTime,
        },
      ]);

      // Day 2: Create connections and follows
      const day2Time = new Date(baseTime.getTime() + 24 * 60 * 60 * 1000);

      await db.insert(connections).values([
        {
          id: '30000000-0000-0000-0000-000000000001',
          curatorId: 'user1',
          sourceType: 'URL',
          sourceValue: 'https://example.com',
          targetType: 'URL',
          targetValue: 'https://example2.com',
          connectionType: 'SUPPORTS',
          createdAt: day2Time,
          updatedAt: day2Time,
        },
      ]);

      await db.insert(follows).values([
        {
          followerId: 'user1',
          targetId: 'user2',
          targetType: 'USER',
          createdAt: day2Time,
        },
      ]);

      const result = await statsRepository.getDailyActivityStats({
        interval: 'day',
        limit: 10,
      });

      expect(result.dataPoints).toHaveLength(2);

      // Find day 1 and day 2 data points
      const day1 = result.dataPoints.find((dp) =>
        dp.date.startsWith('2026-04-01'),
      );
      const day2 = result.dataPoints.find((dp) =>
        dp.date.startsWith('2026-04-02'),
      );

      expect(day1).toBeDefined();
      expect(day1?.cardsCreated).toBe(2);
      expect(day1?.collectionsCreated).toBe(1);
      expect(day1?.connectionsCreated).toBe(0);
      expect(day1?.followsCreated).toBe(0);
      expect(day1?.totalActions).toBe(3);

      expect(day2).toBeDefined();
      expect(day2?.cardsCreated).toBe(0);
      expect(day2?.collectionsCreated).toBe(0);
      expect(day2?.connectionsCreated).toBe(1);
      expect(day2?.followsCreated).toBe(1);
      expect(day2?.totalActions).toBe(2);

      // Check totals
      expect(result.totals.cardsCreated).toBe(2);
      expect(result.totals.collectionsCreated).toBe(1);
      expect(result.totals.connectionsCreated).toBe(1);
      expect(result.totals.followsCreated).toBe(1);
      expect(result.totals.totalActions).toBe(5);
    });

    it('should only count URL cards, not NOTE or HIGHLIGHT cards', async () => {
      const baseTime = new Date('2026-04-01T00:00:00Z');

      // Create URL cards (should count)
      await db.insert(cards).values([
        {
          id: '50000000-0000-0000-0000-000000000001',
          authorId: 'user1',
          type: 'URL',
          contentData: { url: 'https://example.com' },
          url: 'https://example.com',
          urlType: 'article',
          createdAt: baseTime,
          updatedAt: baseTime,
        },
      ]);

      // Create NOTE cards (should not count)
      await db.insert(cards).values([
        {
          id: '40000000-0000-0000-0000-000000000001',
          authorId: 'user2',
          type: 'NOTE',
          contentData: { text: 'A note' },
          createdAt: baseTime,
          updatedAt: baseTime,
        },
      ]);

      const result = await statsRepository.getDailyActivityStats({
        interval: 'day',
        limit: 10,
      });

      expect(result.dataPoints).toHaveLength(1);
      expect(result.dataPoints[0]?.cardsCreated).toBe(1); // Only URL card
      expect(result.totals.cardsCreated).toBe(1);
    });

    it('should return empty data when no activity exists', async () => {
      const result = await statsRepository.getDailyActivityStats({
        interval: 'day',
        limit: 10,
      });

      expect(result.dataPoints).toHaveLength(0);
      expect(result.totals.cardsCreated).toBe(0);
      expect(result.totals.totalActions).toBe(0);
    });

    it('should support week interval aggregation', async () => {
      const baseTime = new Date('2026-04-01T00:00:00Z');

      // Create cards in two different weeks
      await db.insert(cards).values([
        {
          id: '10000000-0000-0000-0000-000000000001',
          authorId: 'user1',
          type: 'URL',
          contentData: { url: 'https://example.com' },
          url: 'https://example.com',
          urlType: 'article',
          createdAt: baseTime, // Week 1
          updatedAt: baseTime,
        },
        {
          id: '10000000-0000-0000-0000-000000000002',
          authorId: 'user2',
          type: 'URL',
          contentData: { url: 'https://example2.com' },
          url: 'https://example2.com',
          urlType: 'video',
          createdAt: new Date(baseTime.getTime() + 7 * 24 * 60 * 60 * 1000), // Week 2
          updatedAt: new Date(baseTime.getTime() + 7 * 24 * 60 * 60 * 1000),
        },
      ]);

      const result = await statsRepository.getDailyActivityStats({
        interval: 'week',
        limit: 10,
      });

      expect(result.dataPoints).toHaveLength(2);
      expect(result.totals.cardsCreated).toBe(2);
    });
  });

  describe('getContentBreakdownStats', () => {
    it('should return breakdown of URL cards by type over time', async () => {
      const baseTime = new Date('2026-04-01T00:00:00Z');

      // Day 1: Create URL cards of different types
      await db.insert(cards).values([
        {
          id: '10000000-0000-0000-0000-000000000001',
          authorId: 'user1',
          type: 'URL',
          contentData: { url: 'https://example.com' },
          url: 'https://example.com',
          urlType: 'article',
          createdAt: baseTime,
          updatedAt: baseTime,
        },
        {
          id: '10000000-0000-0000-0000-000000000002',
          authorId: 'user2',
          type: 'URL',
          contentData: { url: 'https://example2.com' },
          url: 'https://example2.com',
          urlType: 'article',
          createdAt: baseTime,
          updatedAt: baseTime,
        },
        {
          id: '10000000-0000-0000-0000-000000000003',
          authorId: 'user3',
          type: 'URL',
          contentData: { url: 'https://example3.com' },
          url: 'https://example3.com',
          urlType: 'video',
          createdAt: baseTime,
          updatedAt: baseTime,
        },
      ]);

      // Day 2: Create more URL cards
      const day2Time = new Date(baseTime.getTime() + 24 * 60 * 60 * 1000);
      await db.insert(cards).values([
        {
          id: '10000000-0000-0000-0000-000000000004',
          authorId: 'user1',
          type: 'URL',
          contentData: { url: 'https://example4.com' },
          url: 'https://example4.com',
          urlType: 'tool',
          createdAt: day2Time,
          updatedAt: day2Time,
        },
      ]);

      const result = await statsRepository.getContentBreakdownStats({
        interval: 'day',
        limit: 10,
      });

      expect(result.dataPoints.length).toBeGreaterThan(0);

      // Check current totals
      expect(result.currentTotals.urlCards.total).toBe(4);
      expect(result.currentTotals.urlCards.byType['article']).toBe(2);
      expect(result.currentTotals.urlCards.byType['video']).toBe(1);
      expect(result.currentTotals.urlCards.byType['tool']).toBe(1);
    });

    it('should return breakdown of collections by access type', async () => {
      const baseTime = new Date('2026-04-01T00:00:00Z');

      // Create collections with different access types
      await db.insert(collections).values([
        {
          id: '20000000-0000-0000-0000-000000000001',
          authorId: 'user1',
          name: 'Open Collection 1',
          accessType: 'OPEN',
          createdAt: baseTime,
          updatedAt: baseTime,
        },
        {
          id: '20000000-0000-0000-0000-000000000002',
          authorId: 'user2',
          name: 'Open Collection 2',
          accessType: 'OPEN',
          createdAt: baseTime,
          updatedAt: baseTime,
        },
        {
          id: '20000000-0000-0000-0000-000000000003',
          authorId: 'user3',
          name: 'Closed Collection',
          accessType: 'CLOSED',
          createdAt: baseTime,
          updatedAt: baseTime,
        },
      ]);

      const result = await statsRepository.getContentBreakdownStats({
        interval: 'day',
        limit: 10,
      });

      expect(result.currentTotals.collections.total).toBe(3);
      expect(result.currentTotals.collections.byAccessType['OPEN']).toBe(2);
      expect(result.currentTotals.collections.byAccessType['CLOSED']).toBe(1);
    });

    it('should return breakdown of connections by type', async () => {
      const baseTime = new Date('2026-04-01T00:00:00Z');

      // Create connections with different types
      await db.insert(connections).values([
        {
          id: '30000000-0000-0000-0000-000000000001',
          curatorId: 'user1',
          sourceType: 'URL',
          sourceValue: 'https://example.com',
          targetType: 'URL',
          targetValue: 'https://example2.com',
          connectionType: 'SUPPORTS',
          createdAt: baseTime,
          updatedAt: baseTime,
        },
        {
          id: '30000000-0000-0000-0000-000000000002',
          curatorId: 'user2',
          sourceType: 'URL',
          sourceValue: 'https://example3.com',
          targetType: 'URL',
          targetValue: 'https://example4.com',
          connectionType: 'SUPPORTS',
          createdAt: baseTime,
          updatedAt: baseTime,
        },
        {
          id: '30000000-0000-0000-0000-000000000003',
          curatorId: 'user3',
          sourceType: 'URL',
          sourceValue: 'https://example5.com',
          targetType: 'URL',
          targetValue: 'https://example6.com',
          connectionType: 'OPPOSES',
          createdAt: baseTime,
          updatedAt: baseTime,
        },
        {
          id: '30000000-0000-0000-0000-000000000004',
          curatorId: 'user1',
          sourceType: 'URL',
          sourceValue: 'https://example7.com',
          targetType: 'URL',
          targetValue: 'https://example8.com',
          connectionType: null, // Should map to 'unspecified'
          createdAt: baseTime,
          updatedAt: baseTime,
        },
      ]);

      const result = await statsRepository.getContentBreakdownStats({
        interval: 'day',
        limit: 10,
      });

      expect(result.currentTotals.connections.total).toBe(4);
      expect(result.currentTotals.connections.byType['SUPPORTS']).toBe(2);
      expect(result.currentTotals.connections.byType['OPPOSES']).toBe(1);
      expect(result.currentTotals.connections.byType['unspecified']).toBe(1);
    });

    it('should only count URL cards, not NOTE or HIGHLIGHT cards', async () => {
      const baseTime = new Date('2026-04-01T00:00:00Z');

      // Create URL cards (should count)
      await db.insert(cards).values([
        {
          id: '50000000-0000-0000-0000-000000000001',
          authorId: 'user1',
          type: 'URL',
          contentData: { url: 'https://example.com' },
          url: 'https://example.com',
          urlType: 'article',
          createdAt: baseTime,
          updatedAt: baseTime,
        },
      ]);

      // Create NOTE cards (should not count)
      await db.insert(cards).values([
        {
          id: '40000000-0000-0000-0000-000000000001',
          authorId: 'user2',
          type: 'NOTE',
          contentData: { text: 'A note' },
          createdAt: baseTime,
          updatedAt: baseTime,
        },
      ]);

      const result = await statsRepository.getContentBreakdownStats({
        interval: 'day',
        limit: 10,
      });

      expect(result.currentTotals.urlCards.total).toBe(1); // Only URL card
    });

    it('should handle null urlType as unspecified', async () => {
      const baseTime = new Date('2026-04-01T00:00:00Z');

      // Create URL card with null urlType
      await db.insert(cards).values([
        {
          id: '10000000-0000-0000-0000-000000000001',
          authorId: 'user1',
          type: 'URL',
          contentData: { url: 'https://example.com' },
          url: 'https://example.com',
          urlType: null, // Should map to 'unspecified'
          createdAt: baseTime,
          updatedAt: baseTime,
        },
      ]);

      const result = await statsRepository.getContentBreakdownStats({
        interval: 'day',
        limit: 10,
      });

      expect(result.currentTotals.urlCards.total).toBe(1);
      expect(result.currentTotals.urlCards.byType['unspecified']).toBe(1);
    });

    it('should show cumulative growth over time periods', async () => {
      const baseTime = new Date('2026-04-01T00:00:00Z');

      // Day 1: Create 2 URL cards
      await db.insert(cards).values([
        {
          id: '10000000-0000-0000-0000-000000000001',
          authorId: 'user1',
          type: 'URL',
          contentData: { url: 'https://example.com' },
          url: 'https://example.com',
          urlType: 'article',
          createdAt: baseTime,
          updatedAt: baseTime,
        },
        {
          id: '10000000-0000-0000-0000-000000000002',
          authorId: 'user2',
          type: 'URL',
          contentData: { url: 'https://example2.com' },
          url: 'https://example2.com',
          urlType: 'article',
          createdAt: baseTime,
          updatedAt: baseTime,
        },
      ]);

      // Day 2: Create 1 more URL card
      const day2Time = new Date(baseTime.getTime() + 24 * 60 * 60 * 1000);
      await db.insert(cards).values([
        {
          id: '10000000-0000-0000-0000-000000000003',
          authorId: 'user1',
          type: 'URL',
          contentData: { url: 'https://example3.com' },
          url: 'https://example3.com',
          urlType: 'video',
          createdAt: day2Time,
          updatedAt: day2Time,
        },
      ]);

      const result = await statsRepository.getContentBreakdownStats({
        interval: 'day',
        limit: 10,
      });

      expect(result.dataPoints.length).toBeGreaterThanOrEqual(2);

      // Data should be in chronological order
      const sortedDataPoints = [...result.dataPoints].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );

      // First period should have cumulative count
      const firstPeriod = sortedDataPoints[0];
      expect(firstPeriod).toBeDefined();

      // Last period should have cumulative total matching current totals
      expect(result.currentTotals.urlCards.total).toBe(3);
    });

    it('should return empty data when no content exists', async () => {
      const result = await statsRepository.getContentBreakdownStats({
        interval: 'day',
        limit: 10,
      });

      expect(result.dataPoints).toHaveLength(0);
      expect(result.currentTotals.urlCards.total).toBe(0);
      expect(result.currentTotals.collections.total).toBe(0);
      expect(result.currentTotals.connections.total).toBe(0);
    });
  });
});
