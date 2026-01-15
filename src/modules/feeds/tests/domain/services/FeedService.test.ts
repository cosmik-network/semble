import { FeedService, FeedServiceError } from '../../../domain/services/FeedService';
import { InMemoryFeedRepository } from '../../infrastructure/InMemoryFeedRepository';
import { CuratorId } from '../../../../cards/domain/value-objects/CuratorId';
import { CardId } from '../../../../cards/domain/value-objects/CardId';
import { CollectionId } from '../../../../cards/domain/value-objects/CollectionId';
import { UrlType } from '../../../../cards/domain/value-objects/UrlType';
import { FeedActivity } from '../../../domain/FeedActivity';

describe('FeedService', () => {
  let feedService: FeedService;
  let feedRepository: InMemoryFeedRepository;
  let curatorId: CuratorId;
  let anotherCuratorId: CuratorId;
  let cardId: CardId;
  let anotherCardId: CardId;
  let collectionId1: CollectionId;
  let collectionId2: CollectionId;
  let collectionId3: CollectionId;

  beforeEach(() => {
    feedRepository = InMemoryFeedRepository.getInstance();
    feedRepository.clear();
    feedService = new FeedService(feedRepository);

    // Create test data
    curatorId = CuratorId.create('did:plc:testcurator').unwrap();
    anotherCuratorId = CuratorId.create('did:plc:anothercurator').unwrap();
    cardId = CardId.createFromString('card-123').unwrap();
    anotherCardId = CardId.createFromString('card-456').unwrap();
    collectionId1 = CollectionId.createFromString('collection-1').unwrap();
    collectionId2 = CollectionId.createFromString('collection-2').unwrap();
    collectionId3 = CollectionId.createFromString('collection-3').unwrap();
  });

  afterEach(() => {
    InMemoryFeedRepository.resetInstance();
  });

  describe('addCardCollectedActivity', () => {
    it('should create new activity when no recent activity exists', async () => {
      const result = await feedService.addCardCollectedActivity(
        curatorId,
        cardId,
        [collectionId1],
        UrlType.ARTICLE,
      );

      expect(result.isOk()).toBe(true);
      const activity = result.unwrap();

      expect(activity.actorId.value).toBe(curatorId.value);
      expect(activity.cardCollected).toBe(true);
      expect(activity.metadata.cardId).toBe(cardId.getStringValue());
      expect(activity.metadata.collectionIds).toEqual([collectionId1.getStringValue()]);
      expect(activity.urlType).toBe(UrlType.ARTICLE);

      // Verify it was saved to repository
      const allActivities = feedRepository.getAll();
      expect(allActivities).toHaveLength(1);
      expect(allActivities[0]?.activityId.getStringValue()).toBe(
        activity.activityId.getStringValue(),
      );
    });

    it('should create new activity without collections', async () => {
      const result = await feedService.addCardCollectedActivity(
        curatorId,
        cardId,
      );

      expect(result.isOk()).toBe(true);
      const activity = result.unwrap();

      expect(activity.metadata.cardId).toBe(cardId.getStringValue());
      expect(activity.metadata.collectionIds).toBeUndefined();
      expect(activity.urlType).toBeUndefined();
    });

    it('should merge collections when recent activity exists', async () => {
      // Create initial activity with collection1
      const initialResult = await feedService.addCardCollectedActivity(
        curatorId,
        cardId,
        [collectionId1],
      );
      expect(initialResult.isOk()).toBe(true);
      const initialActivity = initialResult.unwrap();

      // Simulate time passing but within 2 minutes (1 minute)
      jest.spyOn(Date, 'now').mockReturnValue(
        initialActivity.createdAt.getTime() + 60 * 1000, // 1 minute later
      );

      // Add same card to different collection
      const mergeResult = await feedService.addCardCollectedActivity(
        curatorId,
        cardId,
        [collectionId2],
      );

      expect(mergeResult.isOk()).toBe(true);
      const mergedActivity = mergeResult.unwrap();

      // Should be the same activity (same ID)
      expect(mergedActivity.activityId.getStringValue()).toBe(
        initialActivity.activityId.getStringValue(),
      );

      // Should have both collections
      expect(mergedActivity.metadata.collectionIds).toEqual(
        expect.arrayContaining([
          collectionId1.getStringValue(),
          collectionId2.getStringValue(),
        ]),
      );
      expect(mergedActivity.metadata.collectionIds).toHaveLength(2);

      // Should still only have one activity in repository
      const allActivities = feedRepository.getAll();
      expect(allActivities).toHaveLength(1);

      jest.restoreAllMocks();
    });

    it('should merge multiple collections at once', async () => {
      // Create initial activity with collection1
      const initialResult = await feedService.addCardCollectedActivity(
        curatorId,
        cardId,
        [collectionId1],
      );
      expect(initialResult.isOk()).toBe(true);
      const initialActivity = initialResult.unwrap();

      // Simulate time passing but within 2 minutes
      jest.spyOn(Date, 'now').mockReturnValue(
        initialActivity.createdAt.getTime() + 60 * 1000,
      );

      // Add same card to multiple collections
      const mergeResult = await feedService.addCardCollectedActivity(
        curatorId,
        cardId,
        [collectionId2, collectionId3],
      );

      expect(mergeResult.isOk()).toBe(true);
      const mergedActivity = mergeResult.unwrap();

      // Should have all three collections
      expect(mergedActivity.metadata.collectionIds).toEqual(
        expect.arrayContaining([
          collectionId1.getStringValue(),
          collectionId2.getStringValue(),
          collectionId3.getStringValue(),
        ]),
      );
      expect(mergedActivity.metadata.collectionIds).toHaveLength(3);

      jest.restoreAllMocks();
    });

    it('should handle duplicate collections in merge', async () => {
      // Create initial activity with collection1
      const initialResult = await feedService.addCardCollectedActivity(
        curatorId,
        cardId,
        [collectionId1],
      );
      expect(initialResult.isOk()).toBe(true);
      const initialActivity = initialResult.unwrap();

      // Simulate time passing but within 2 minutes
      jest.spyOn(Date, 'now').mockReturnValue(
        initialActivity.createdAt.getTime() + 60 * 1000,
      );

      // Try to add same collection again
      const mergeResult = await feedService.addCardCollectedActivity(
        curatorId,
        cardId,
        [collectionId1, collectionId2], // collection1 is duplicate
      );

      expect(mergeResult.isOk()).toBe(true);
      const mergedActivity = mergeResult.unwrap();

      // Should have both collections but no duplicates
      expect(mergedActivity.metadata.collectionIds).toEqual(
        expect.arrayContaining([
          collectionId1.getStringValue(),
          collectionId2.getStringValue(),
        ]),
      );
      expect(mergedActivity.metadata.collectionIds).toHaveLength(2);

      jest.restoreAllMocks();
    });

    it('should return existing activity when no new collections to add', async () => {
      // Create initial activity with collection1
      const initialResult = await feedService.addCardCollectedActivity(
        curatorId,
        cardId,
        [collectionId1],
      );
      expect(initialResult.isOk()).toBe(true);
      const initialActivity = initialResult.unwrap();

      // Simulate time passing but within 2 minutes
      jest.spyOn(Date, 'now').mockReturnValue(
        initialActivity.createdAt.getTime() + 60 * 1000,
      );

      // Add same card without collections
      const result = await feedService.addCardCollectedActivity(
        curatorId,
        cardId,
      );

      expect(result.isOk()).toBe(true);
      const returnedActivity = result.unwrap();

      // Should be the same activity
      expect(returnedActivity.activityId.getStringValue()).toBe(
        initialActivity.activityId.getStringValue(),
      );

      // Collections should remain unchanged
      expect(returnedActivity.metadata.collectionIds).toEqual([
        collectionId1.getStringValue(),
      ]);

      jest.restoreAllMocks();
    });

    it('should create new activity when time window has passed', async () => {
      // Create initial activity
      const initialResult = await feedService.addCardCollectedActivity(
        curatorId,
        cardId,
        [collectionId1],
      );
      expect(initialResult.isOk()).toBe(true);
      const initialActivity = initialResult.unwrap();

      // Simulate time passing beyond 2 minutes (3 minutes)
      jest.spyOn(Date, 'now').mockReturnValue(
        initialActivity.createdAt.getTime() + 3 * 60 * 1000,
      );

      // Add same card to different collection
      const newResult = await feedService.addCardCollectedActivity(
        curatorId,
        cardId,
        [collectionId2],
      );

      expect(newResult.isOk()).toBe(true);
      const newActivity = newResult.unwrap();

      // Should be a different activity (different ID)
      expect(newActivity.activityId.getStringValue()).not.toBe(
        initialActivity.activityId.getStringValue(),
      );

      // Should only have the new collection
      expect(newActivity.metadata.collectionIds).toEqual([
        collectionId2.getStringValue(),
      ]);

      // Should have two activities in repository
      const allActivities = feedRepository.getAll();
      expect(allActivities).toHaveLength(2);

      jest.restoreAllMocks();
    });

    it('should create separate activities for different actors', async () => {
      // Create activity for first curator
      const result1 = await feedService.addCardCollectedActivity(
        curatorId,
        cardId,
        [collectionId1],
      );
      expect(result1.isOk()).toBe(true);

      // Create activity for different curator with same card
      const result2 = await feedService.addCardCollectedActivity(
        anotherCuratorId,
        cardId,
        [collectionId2],
      );
      expect(result2.isOk()).toBe(true);

      const activity1 = result1.unwrap();
      const activity2 = result2.unwrap();

      // Should be different activities
      expect(activity1.activityId.getStringValue()).not.toBe(
        activity2.activityId.getStringValue(),
      );

      // Should have separate collections
      expect(activity1.metadata.collectionIds).toEqual([collectionId1.getStringValue()]);
      expect(activity2.metadata.collectionIds).toEqual([collectionId2.getStringValue()]);

      // Should have two activities in repository
      const allActivities = feedRepository.getAll();
      expect(allActivities).toHaveLength(2);
    });

    it('should create separate activities for different cards', async () => {
      // Create activity for first card
      const result1 = await feedService.addCardCollectedActivity(
        curatorId,
        cardId,
        [collectionId1],
      );
      expect(result1.isOk()).toBe(true);

      // Create activity for different card
      const result2 = await feedService.addCardCollectedActivity(
        curatorId,
        anotherCardId,
        [collectionId2],
      );
      expect(result2.isOk()).toBe(true);

      const activity1 = result1.unwrap();
      const activity2 = result2.unwrap();

      // Should be different activities
      expect(activity1.activityId.getStringValue()).not.toBe(
        activity2.activityId.getStringValue(),
      );

      // Should have different card IDs
      expect(activity1.metadata.cardId).toBe(cardId.getStringValue());
      expect(activity2.metadata.cardId).toBe(anotherCardId.getStringValue());

      // Should have two activities in repository
      const allActivities = feedRepository.getAll();
      expect(allActivities).toHaveLength(2);
    });

    it('should handle repository errors gracefully', async () => {
      // Mock repository to return error
      jest.spyOn(feedRepository, 'findRecentCardCollectedActivity')
        .mockResolvedValue(Promise.resolve({
          isErr: () => true,
          error: new Error('Database connection failed'),
        } as any));

      const result = await feedService.addCardCollectedActivity(
        curatorId,
        cardId,
        [collectionId1],
      );

      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(FeedServiceError);
      expect(result.error.message).toContain('Failed to check for recent activity');

      jest.restoreAllMocks();
    });

    it('should handle update errors gracefully', async () => {
      // Create initial activity
      const initialResult = await feedService.addCardCollectedActivity(
        curatorId,
        cardId,
        [collectionId1],
      );
      expect(initialResult.isOk()).toBe(true);

      // Mock update to fail
      jest.spyOn(feedRepository, 'updateActivity')
        .mockResolvedValue(Promise.resolve({
          isErr: () => true,
          error: new Error('Update failed'),
        } as any));

      // Simulate time passing but within 2 minutes
      jest.spyOn(Date, 'now').mockReturnValue(
        initialResult.unwrap().createdAt.getTime() + 60 * 1000,
      );

      const result = await feedService.addCardCollectedActivity(
        curatorId,
        cardId,
        [collectionId2],
      );

      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(FeedServiceError);
      expect(result.error.message).toContain('Failed to update activity');

      jest.restoreAllMocks();
    });
  });
});
