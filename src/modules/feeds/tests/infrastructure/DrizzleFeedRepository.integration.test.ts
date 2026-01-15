import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import postgres from 'postgres';
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DrizzleFeedRepository } from '../../infrastructure/repositories/DrizzleFeedRepository';
import { FeedActivity } from '../../domain/FeedActivity';
import { CuratorId } from '../../../cards/domain/value-objects/CuratorId';
import { CardId } from '../../../cards/domain/value-objects/CardId';
import { CollectionId } from '../../../cards/domain/value-objects/CollectionId';
import { feedActivities } from '../../infrastructure/repositories/schema/feedActivity.sql';
import { createTestSchema } from '../../../cards/tests/test-utils/createTestSchema';

describe('DrizzleFeedRepository', () => {
  let container: StartedPostgreSqlContainer;
  let db: PostgresJsDatabase;
  let feedRepository: DrizzleFeedRepository;

  // Test data
  let curatorId: CuratorId;
  let anotherCuratorId: CuratorId;
  let cardId: CardId;
  let anotherCardId: CardId;
  let collectionId: CollectionId;

  // Setup before all tests
  beforeAll(async () => {
    // Start PostgreSQL container
    container = await new PostgreSqlContainer('postgres:14').start();

    // Create database connection
    const connectionString = container.getConnectionUri();
    process.env.DATABASE_URL = connectionString;
    const client = postgres(connectionString);
    db = drizzle(client);

    // Create repository
    feedRepository = new DrizzleFeedRepository(db);

    // Create schema using helper function
    await createTestSchema(db);

    // Create test data
    curatorId = CuratorId.create('did:plc:testcurator').unwrap();
    anotherCuratorId = CuratorId.create('did:plc:anothercurator').unwrap();
    cardId = CardId.createFromString('card-123').unwrap();
    anotherCardId = CardId.createFromString('card-456').unwrap();
    collectionId = CollectionId.createFromString('collection-123').unwrap();
  }, 60000); // Increase timeout for container startup

  // Cleanup after all tests
  afterAll(async () => {
    // Stop container
    await container.stop();
  });

  // Clear data between tests
  beforeEach(async () => {
    await db.delete(feedActivities);
  });

  it('should add and retrieve a card collected activity', async () => {
    // Create a card collected activity
    const activityResult = FeedActivity.createCardCollected(curatorId, cardId, [
      collectionId,
    ]);

    expect(activityResult.isOk()).toBe(true);
    const activity = activityResult.unwrap();

    // Add the activity
    const addResult = await feedRepository.addActivity(activity);
    expect(addResult.isOk()).toBe(true);

    // Retrieve the activity by ID
    const retrievedResult = await feedRepository.findById(activity.activityId);
    expect(retrievedResult.isOk()).toBe(true);

    const retrievedActivity = retrievedResult.unwrap();
    expect(retrievedActivity).not.toBeNull();
    expect(retrievedActivity?.activityId.getStringValue()).toBe(
      activity.activityId.getStringValue(),
    );
    expect(retrievedActivity?.actorId.value).toBe(curatorId.value);
    expect(retrievedActivity?.cardCollected).toBe(true);
    expect(retrievedActivity?.metadata.cardId).toBe(cardId.getStringValue());
    expect(retrievedActivity?.metadata.collectionIds).toEqual([
      collectionId.getStringValue(),
    ]);
  });

  it('should add a card collected activity without collections', async () => {
    // Create a card collected activity without collections
    const activityResult = FeedActivity.createCardCollected(curatorId, cardId);

    expect(activityResult.isOk()).toBe(true);
    const activity = activityResult.unwrap();

    // Add the activity
    const addResult = await feedRepository.addActivity(activity);
    expect(addResult.isOk()).toBe(true);

    // Retrieve the activity
    const retrievedResult = await feedRepository.findById(activity.activityId);
    const retrievedActivity = retrievedResult.unwrap();

    expect(retrievedActivity?.metadata.cardId).toBe(cardId.getStringValue());
    expect(retrievedActivity?.metadata.collectionIds).toBeUndefined();
  });

  it('should retrieve global feed with pagination', async () => {
    // Create multiple activities with different timestamps to ensure proper ordering
    const baseTime = new Date();
    const activity1 = FeedActivity.createCardCollected(
      curatorId,
      cardId,
      [collectionId],
      undefined,
      new Date(baseTime.getTime() - 200), // oldest
    ).unwrap();

    const activity2 = FeedActivity.createCardCollected(
      anotherCuratorId,
      anotherCardId,
      undefined,
      undefined,
      new Date(baseTime.getTime() - 100), // middle
    ).unwrap();

    const activity3 = FeedActivity.createCardCollected(
      curatorId,
      anotherCardId,
      [collectionId],
      undefined,
      new Date(baseTime.getTime()), // newest
    ).unwrap();

    // Add activities (order doesn't matter since timestamps are set)
    await feedRepository.addActivity(activity1);
    await feedRepository.addActivity(activity2);
    await feedRepository.addActivity(activity3);

    // Get first page
    const feedResult = await feedRepository.getGlobalFeed({
      page: 1,
      limit: 2,
    });

    expect(feedResult.isOk()).toBe(true);
    const feed = feedResult.unwrap();

    expect(feed.activities).toHaveLength(2);
    expect(feed.totalCount).toBe(3);
    expect(feed.hasMore).toBe(true);
    expect(feed.nextCursor).toBeDefined();

    // Activities should be ordered by creation time (newest first)
    expect(feed.activities[0]?.activityId.getStringValue()).toBe(
      activity3.activityId.getStringValue(),
    );
    expect(feed.activities[1]?.activityId.getStringValue()).toBe(
      activity2.activityId.getStringValue(),
    );

    // Get second page
    const secondPageResult = await feedRepository.getGlobalFeed({
      page: 2,
      limit: 2,
    });

    const secondPage = secondPageResult.unwrap();
    expect(secondPage.activities).toHaveLength(1);
    expect(secondPage.hasMore).toBe(false);
    expect(secondPage.activities[0]?.activityId.getStringValue()).toBe(
      activity1.activityId.getStringValue(),
    );
  });

  it('should support cursor-based pagination', async () => {
    // Create multiple activities with different timestamps
    const baseTime = new Date();
    const activity1 = FeedActivity.createCardCollected(
      curatorId,
      cardId,
      undefined,
      undefined,
      new Date(baseTime.getTime() - 200), // oldest
    ).unwrap();

    const activity2 = FeedActivity.createCardCollected(
      anotherCuratorId,
      anotherCardId,
      undefined,
      undefined,
      new Date(baseTime.getTime() - 100), // middle
    ).unwrap();

    const activity3 = FeedActivity.createCardCollected(
      curatorId,
      anotherCardId,
      undefined,
      undefined,
      new Date(baseTime.getTime()), // newest
    ).unwrap();

    // Add activities (order doesn't matter since timestamps are set)
    await feedRepository.addActivity(activity1);
    await feedRepository.addActivity(activity2);
    await feedRepository.addActivity(activity3);

    // Get activities before activity3 (should return activity2 and activity1)
    const feedResult = await feedRepository.getGlobalFeed({
      page: 1,
      limit: 10,
      beforeActivityId: activity3.activityId,
    });

    expect(feedResult.isOk()).toBe(true);
    const feed = feedResult.unwrap();

    expect(feed.activities).toHaveLength(2);
    expect(feed.activities[0]?.activityId.getStringValue()).toBe(
      activity2.activityId.getStringValue(),
    );
    expect(feed.activities[1]?.activityId.getStringValue()).toBe(
      activity1.activityId.getStringValue(),
    );
  });

  it('should return null when activity is not found', async () => {
    const nonExistentId = CardId.createFromString('non-existent').unwrap();
    const activityId = FeedActivity.createCardCollected(
      curatorId,
      nonExistentId,
    ).unwrap().activityId;

    const result = await feedRepository.findById(activityId);
    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toBeNull();
  });

  it('should return empty feed when no activities exist', async () => {
    const feedResult = await feedRepository.getGlobalFeed({
      page: 1,
      limit: 10,
    });

    expect(feedResult.isOk()).toBe(true);
    const feed = feedResult.unwrap();

    expect(feed.activities).toHaveLength(0);
    expect(feed.totalCount).toBe(0);
    expect(feed.hasMore).toBe(false);
    expect(feed.nextCursor).toBeUndefined();
  });

  it('should handle activities from different actors', async () => {
    // Create activities from different actors
    const activity1 = FeedActivity.createCardCollected(
      curatorId,
      cardId,
    ).unwrap();

    const activity2 = FeedActivity.createCardCollected(
      anotherCuratorId,
      anotherCardId,
    ).unwrap();

    await feedRepository.addActivity(activity1);
    await feedRepository.addActivity(activity2);

    // Get all activities
    const feedResult = await feedRepository.getGlobalFeed({
      page: 1,
      limit: 10,
    });

    const feed = feedResult.unwrap();
    expect(feed.activities).toHaveLength(2);

    const actorIds = feed.activities.map((a) => a.actorId.value);
    expect(actorIds).toContain(curatorId.value);
    expect(actorIds).toContain(anotherCuratorId.value);
  });

  it('should preserve activity metadata correctly', async () => {
    const multipleCollections = [
      collectionId,
      CollectionId.createFromString('collection-456').unwrap(),
    ];

    const activity = FeedActivity.createCardCollected(
      curatorId,
      cardId,
      multipleCollections,
    ).unwrap();

    await feedRepository.addActivity(activity);

    const retrievedResult = await feedRepository.findById(activity.activityId);
    const retrievedActivity = retrievedResult.unwrap();

    expect(retrievedActivity?.metadata.cardId).toBe(cardId.getStringValue());
    expect(retrievedActivity?.metadata.collectionIds).toEqual([
      collectionId.getStringValue(),
      'collection-456',
    ]);
  });

  describe('deduplication and merging', () => {
    it('should find recent card collected activity within time window', async () => {
      const baseTime = new Date();
      
      // Create an activity 1 minute ago
      const recentActivity = FeedActivity.createCardCollected(
        curatorId,
        cardId,
        [collectionId],
        undefined,
        new Date(baseTime.getTime() - 60 * 1000), // 1 minute ago
      ).unwrap();

      await feedRepository.addActivity(recentActivity);

      // Should find the activity within 2 minutes
      const foundResult = await feedRepository.findRecentCardCollectedActivity(
        curatorId,
        cardId,
        2, // within 2 minutes
      );

      expect(foundResult.isOk()).toBe(true);
      const foundActivity = foundResult.unwrap();
      expect(foundActivity).not.toBeNull();
      expect(foundActivity?.activityId.getStringValue()).toBe(
        recentActivity.activityId.getStringValue(),
      );
    });

    it('should not find activity outside time window', async () => {
      const baseTime = new Date();
      
      // Create an activity 3 minutes ago
      const oldActivity = FeedActivity.createCardCollected(
        curatorId,
        cardId,
        [collectionId],
        undefined,
        new Date(baseTime.getTime() - 3 * 60 * 1000), // 3 minutes ago
      ).unwrap();

      await feedRepository.addActivity(oldActivity);

      // Should not find the activity within 2 minutes
      const foundResult = await feedRepository.findRecentCardCollectedActivity(
        curatorId,
        cardId,
        2, // within 2 minutes
      );

      expect(foundResult.isOk()).toBe(true);
      expect(foundResult.unwrap()).toBeNull();
    });

    it('should not find activity for different actor', async () => {
      const baseTime = new Date();
      
      // Create an activity for different actor
      const activity = FeedActivity.createCardCollected(
        anotherCuratorId, // different actor
        cardId,
        [collectionId],
        undefined,
        new Date(baseTime.getTime() - 60 * 1000), // 1 minute ago
      ).unwrap();

      await feedRepository.addActivity(activity);

      // Should not find the activity for different actor
      const foundResult = await feedRepository.findRecentCardCollectedActivity(
        curatorId, // searching for different actor
        cardId,
        2,
      );

      expect(foundResult.isOk()).toBe(true);
      expect(foundResult.unwrap()).toBeNull();
    });

    it('should not find activity for different card', async () => {
      const baseTime = new Date();
      
      // Create an activity for different card
      const activity = FeedActivity.createCardCollected(
        curatorId,
        anotherCardId, // different card
        [collectionId],
        undefined,
        new Date(baseTime.getTime() - 60 * 1000), // 1 minute ago
      ).unwrap();

      await feedRepository.addActivity(activity);

      // Should not find the activity for different card
      const foundResult = await feedRepository.findRecentCardCollectedActivity(
        curatorId,
        cardId, // searching for different card
        2,
      );

      expect(foundResult.isOk()).toBe(true);
      expect(foundResult.unwrap()).toBeNull();
    });

    it('should update activity metadata correctly', async () => {
      const originalCollections = [collectionId];
      const activity = FeedActivity.createCardCollected(
        curatorId,
        cardId,
        originalCollections,
      ).unwrap();

      await feedRepository.addActivity(activity);

      // Merge new collections
      const newCollection = CollectionId.createFromString('new-collection').unwrap();
      activity.mergeCollections([newCollection]);

      // Update the activity
      const updateResult = await feedRepository.updateActivity(activity);
      expect(updateResult.isOk()).toBe(true);

      // Retrieve and verify the updated activity
      const retrievedResult = await feedRepository.findById(activity.activityId);
      const retrievedActivity = retrievedResult.unwrap();

      expect(retrievedActivity?.metadata.collectionIds).toEqual([
        collectionId.getStringValue(),
        newCollection.getStringValue(),
      ]);
    });

    it('should handle merging duplicate collections correctly', async () => {
      const originalCollections = [collectionId];
      const activity = FeedActivity.createCardCollected(
        curatorId,
        cardId,
        originalCollections,
      ).unwrap();

      await feedRepository.addActivity(activity);

      // Try to merge the same collection again
      activity.mergeCollections([collectionId]); // duplicate

      // Update the activity
      await feedRepository.updateActivity(activity);

      // Retrieve and verify no duplicates
      const retrievedResult = await feedRepository.findById(activity.activityId);
      const retrievedActivity = retrievedResult.unwrap();

      expect(retrievedActivity?.metadata.collectionIds).toEqual([
        collectionId.getStringValue(),
      ]);
      expect(retrievedActivity?.metadata.collectionIds).toHaveLength(1);
    });

    it('should find most recent activity when multiple exist', async () => {
      const baseTime = new Date();
      
      // Create older activity (2 minutes ago)
      const olderActivity = FeedActivity.createCardCollected(
        curatorId,
        cardId,
        [collectionId],
        undefined,
        new Date(baseTime.getTime() - 2 * 60 * 1000),
      ).unwrap();

      // Create newer activity (1 minute ago)
      const newerActivity = FeedActivity.createCardCollected(
        curatorId,
        cardId,
        [CollectionId.createFromString('another-collection').unwrap()],
        undefined,
        new Date(baseTime.getTime() - 60 * 1000),
      ).unwrap();

      await feedRepository.addActivity(olderActivity);
      await feedRepository.addActivity(newerActivity);

      // Should find the newer activity
      const foundResult = await feedRepository.findRecentCardCollectedActivity(
        curatorId,
        cardId,
        3, // within 3 minutes
      );

      expect(foundResult.isOk()).toBe(true);
      const foundActivity = foundResult.unwrap();
      expect(foundActivity?.activityId.getStringValue()).toBe(
        newerActivity.activityId.getStringValue(),
      );
    });
  });

  describe('getGemsFeed', () => {
    let collection1: CollectionId;
    let collection2: CollectionId;
    let collection3: CollectionId;

    beforeEach(async () => {
      collection1 = CollectionId.createFromString('gems-collection-1').unwrap();
      collection2 = CollectionId.createFromString('gems-collection-2').unwrap();
      collection3 = CollectionId.createFromString('gems-collection-3').unwrap();
    });

    it('should return activities that match any of the provided collection IDs', async () => {
      const baseTime = new Date();

      // Activity with collection1
      const activity1 = FeedActivity.createCardCollected(
        curatorId,
        cardId,
        [collection1],
        undefined,
        new Date(baseTime.getTime() - 300),
      ).unwrap();

      // Activity with collection2
      const activity2 = FeedActivity.createCardCollected(
        anotherCuratorId,
        anotherCardId,
        [collection2],
        undefined,
        new Date(baseTime.getTime() - 200),
      ).unwrap();

      // Activity with both collection1 and collection3
      const activity3 = FeedActivity.createCardCollected(
        curatorId,
        anotherCardId,
        [collection1, collection3],
        undefined,
        new Date(baseTime.getTime() - 100),
      ).unwrap();

      // Activity with no collections
      const activity4 = FeedActivity.createCardCollected(
        anotherCuratorId,
        cardId,
        undefined,
        undefined,
        new Date(baseTime.getTime()),
      ).unwrap();

      await feedRepository.addActivity(activity1);
      await feedRepository.addActivity(activity2);
      await feedRepository.addActivity(activity3);
      await feedRepository.addActivity(activity4);

      // Query for activities in collection1 or collection2
      const gemsResult = await feedRepository.getGemsFeed(
        [collection1, collection2],
        { page: 1, limit: 10 },
      );

      expect(gemsResult.isOk()).toBe(true);
      const gemsFeed = gemsResult.unwrap();

      expect(gemsFeed.activities).toHaveLength(3);
      expect(gemsFeed.totalCount).toBe(3);

      // Should be ordered by creation time (newest first)
      const activityIds = gemsFeed.activities.map((a) =>
        a.activityId.getStringValue(),
      );
      expect(activityIds).toEqual([
        activity3.activityId.getStringValue(),
        activity2.activityId.getStringValue(),
        activity1.activityId.getStringValue(),
      ]);

      // Activity4 should not be included (no collections)
      expect(activityIds).not.toContain(activity4.activityId.getStringValue());
    });

    it('should return empty feed when no activities match the collection IDs', async () => {
      // Create activities with different collections
      const activity1 = FeedActivity.createCardCollected(curatorId, cardId, [
        collection1,
      ]).unwrap();

      const activity2 = FeedActivity.createCardCollected(
        anotherCuratorId,
        anotherCardId,
        undefined, // no collections
      ).unwrap();

      await feedRepository.addActivity(activity1);
      await feedRepository.addActivity(activity2);

      // Query for activities in collection2 (which doesn't exist in our data)
      const gemsResult = await feedRepository.getGemsFeed([collection2], {
        page: 1,
        limit: 10,
      });

      expect(gemsResult.isOk()).toBe(true);
      const gemsFeed = gemsResult.unwrap();

      expect(gemsFeed.activities).toHaveLength(0);
      expect(gemsFeed.totalCount).toBe(0);
      expect(gemsFeed.hasMore).toBe(false);
      expect(gemsFeed.nextCursor).toBeUndefined();
    });

    it('should support pagination for gems feed', async () => {
      const baseTime = new Date();

      // Create multiple activities with collection1
      const activities = [];
      for (let i = 0; i < 5; i++) {
        const activity = FeedActivity.createCardCollected(
          curatorId,
          CardId.createFromString(`card-${i}`).unwrap(),
          [collection1],
          undefined,
          new Date(baseTime.getTime() - i * 100),
        ).unwrap();
        activities.push(activity);
        await feedRepository.addActivity(activity);
      }

      // Get first page (2 items)
      const firstPageResult = await feedRepository.getGemsFeed([collection1], {
        page: 1,
        limit: 2,
      });

      expect(firstPageResult.isOk()).toBe(true);
      const firstPage = firstPageResult.unwrap();

      expect(firstPage.activities).toHaveLength(2);
      expect(firstPage.totalCount).toBe(5);
      expect(firstPage.hasMore).toBe(true);
      expect(firstPage.nextCursor).toBeDefined();

      // Get second page
      const secondPageResult = await feedRepository.getGemsFeed([collection1], {
        page: 2,
        limit: 2,
      });

      const secondPage = secondPageResult.unwrap();
      expect(secondPage.activities).toHaveLength(2);
      expect(secondPage.hasMore).toBe(true);

      // Get third page (last item)
      const thirdPageResult = await feedRepository.getGemsFeed([collection1], {
        page: 3,
        limit: 2,
      });

      const thirdPage = thirdPageResult.unwrap();
      expect(thirdPage.activities).toHaveLength(1);
      expect(thirdPage.hasMore).toBe(false);
      expect(thirdPage.nextCursor).toBeUndefined();
    });

    it('should support cursor-based pagination for gems feed', async () => {
      const baseTime = new Date();

      // Create activities with collection1
      const activity1 = FeedActivity.createCardCollected(
        curatorId,
        cardId,
        [collection1],
        undefined,
        new Date(baseTime.getTime() - 300), // oldest
      ).unwrap();

      const activity2 = FeedActivity.createCardCollected(
        anotherCuratorId,
        anotherCardId,
        [collection1],
        undefined,
        new Date(baseTime.getTime() - 200), // middle
      ).unwrap();

      const activity3 = FeedActivity.createCardCollected(
        curatorId,
        CardId.createFromString('card-999').unwrap(),
        [collection1],
        undefined,
        new Date(baseTime.getTime() - 100), // newest
      ).unwrap();

      await feedRepository.addActivity(activity1);
      await feedRepository.addActivity(activity2);
      await feedRepository.addActivity(activity3);

      // Get activities before activity3 (should return activity2 and activity1)
      const gemsResult = await feedRepository.getGemsFeed([collection1], {
        page: 1,
        limit: 10,
        beforeActivityId: activity3.activityId,
      });

      expect(gemsResult.isOk()).toBe(true);
      const gemsFeed = gemsResult.unwrap();

      expect(gemsFeed.activities).toHaveLength(2);
      expect(gemsFeed.activities[0]?.activityId.getStringValue()).toBe(
        activity2.activityId.getStringValue(),
      );
      expect(gemsFeed.activities[1]?.activityId.getStringValue()).toBe(
        activity1.activityId.getStringValue(),
      );
    });

    it('should handle activities with multiple collections correctly', async () => {
      // Activity with multiple collections including collection1
      const activity1 = FeedActivity.createCardCollected(curatorId, cardId, [
        collection1,
        collection2,
        collection3,
      ]).unwrap();

      // Activity with only collection2
      const activity2 = FeedActivity.createCardCollected(
        anotherCuratorId,
        anotherCardId,
        [collection2],
      ).unwrap();

      // Activity with collection3 only
      const activity3 = FeedActivity.createCardCollected(
        curatorId,
        CardId.createFromString('card-999').unwrap(),
        [collection3],
      ).unwrap();

      await feedRepository.addActivity(activity1);
      await feedRepository.addActivity(activity2);
      await feedRepository.addActivity(activity3);

      // Query for collection1 - should only return activity1
      const collection1Result = await feedRepository.getGemsFeed(
        [collection1],
        { page: 1, limit: 10 },
      );

      const collection1Feed = collection1Result.unwrap();
      expect(collection1Feed.activities).toHaveLength(1);
      expect(collection1Feed.activities[0]?.activityId.getStringValue()).toBe(
        activity1.activityId.getStringValue(),
      );

      // Query for collection2 - should return activity1 and activity2
      const collection2Result = await feedRepository.getGemsFeed(
        [collection2],
        { page: 1, limit: 10 },
      );

      const collection2Feed = collection2Result.unwrap();
      expect(collection2Feed.activities).toHaveLength(2);
      const activity2Ids = collection2Feed.activities.map((a) =>
        a.activityId.getStringValue(),
      );
      expect(activity2Ids).toContain(activity1.activityId.getStringValue());
      expect(activity2Ids).toContain(activity2.activityId.getStringValue());
    });

    it('should return empty feed when querying with empty collection IDs array', async () => {
      // Create some activities
      const activity = FeedActivity.createCardCollected(curatorId, cardId, [
        collection1,
      ]).unwrap();

      await feedRepository.addActivity(activity);

      // Query with empty collection IDs array
      const gemsResult = await feedRepository.getGemsFeed([], {
        page: 1,
        limit: 10,
      });

      expect(gemsResult.isOk()).toBe(true);
      const gemsFeed = gemsResult.unwrap();

      expect(gemsFeed.activities).toHaveLength(0);
      expect(gemsFeed.totalCount).toBe(0);
      expect(gemsFeed.hasMore).toBe(false);
    });
  });
});
