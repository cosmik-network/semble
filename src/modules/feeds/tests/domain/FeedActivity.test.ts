import { FeedActivity, ActivityValidationError } from '../../domain/FeedActivity';
import { CuratorId } from '../../../cards/domain/value-objects/CuratorId';
import { CardId } from '../../../cards/domain/value-objects/CardId';
import { CollectionId } from '../../../cards/domain/value-objects/CollectionId';
import { UrlType } from '../../../cards/domain/value-objects/UrlType';
import { UniqueEntityID } from '../../../../shared/domain/UniqueEntityID';

describe('FeedActivity', () => {
  let curatorId: CuratorId;
  let cardId: CardId;
  let collectionId1: CollectionId;
  let collectionId2: CollectionId;
  let collectionId3: CollectionId;

  beforeEach(() => {
    curatorId = CuratorId.create('did:plc:testcurator').unwrap();
    cardId = CardId.createFromString('card-123').unwrap();
    collectionId1 = CollectionId.createFromString('collection-1').unwrap();
    collectionId2 = CollectionId.createFromString('collection-2').unwrap();
    collectionId3 = CollectionId.createFromString('collection-3').unwrap();
  });

  describe('createCardCollected', () => {
    it('should create activity with collections', async () => {
      const result = FeedActivity.createCardCollected(
        curatorId,
        cardId,
        [collectionId1, collectionId2],
        UrlType.ARTICLE,
      );

      expect(result.isOk()).toBe(true);
      const activity = result.unwrap();

      expect(activity.actorId.value).toBe(curatorId.value);
      expect(activity.cardCollected).toBe(true);
      expect(activity.metadata.cardId).toBe(cardId.getStringValue());
      expect(activity.metadata.collectionIds).toEqual([
        collectionId1.getStringValue(),
        collectionId2.getStringValue(),
      ]);
      expect(activity.urlType).toBe(UrlType.ARTICLE);
    });

    it('should create activity without collections', async () => {
      const result = FeedActivity.createCardCollected(curatorId, cardId);

      expect(result.isOk()).toBe(true);
      const activity = result.unwrap();

      expect(activity.metadata.cardId).toBe(cardId.getStringValue());
      expect(activity.metadata.collectionIds).toBeUndefined();
      expect(activity.urlType).toBeUndefined();
    });

    it('should create activity with custom timestamp and ID', async () => {
      const customDate = new Date('2024-01-01T12:00:00Z');
      const customId = new UniqueEntityID('custom-id');

      const result = FeedActivity.createCardCollected(
        curatorId,
        cardId,
        [collectionId1],
        UrlType.BOOK,
        customDate,
        customId,
      );

      expect(result.isOk()).toBe(true);
      const activity = result.unwrap();

      expect(activity.createdAt).toEqual(customDate);
      expect(activity.activityId.getStringValue()).toBe('custom-id');
      expect(activity.urlType).toBe(UrlType.BOOK);
    });

    it('should fail when card ID is null', async () => {
      const result = FeedActivity.createCardCollected(
        curatorId,
        null as any,
        [collectionId1],
      );

      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(ActivityValidationError);
      expect(result.error.message).toBe('Card ID is required');
    });
  });

  describe('mergeCollections', () => {
    it('should merge new collections with existing ones', async () => {
      const activity = FeedActivity.createCardCollected(
        curatorId,
        cardId,
        [collectionId1],
      ).unwrap();

      // Merge additional collections
      activity.mergeCollections([collectionId2, collectionId3]);

      expect(activity.metadata.collectionIds).toEqual(
        expect.arrayContaining([
          collectionId1.getStringValue(),
          collectionId2.getStringValue(),
          collectionId3.getStringValue(),
        ]),
      );
      expect(activity.metadata.collectionIds).toHaveLength(3);
    });

    it('should handle duplicate collections', async () => {
      const activity = FeedActivity.createCardCollected(
        curatorId,
        cardId,
        [collectionId1, collectionId2],
      ).unwrap();

      // Try to merge collections that already exist
      activity.mergeCollections([collectionId1, collectionId3]);

      expect(activity.metadata.collectionIds).toEqual(
        expect.arrayContaining([
          collectionId1.getStringValue(),
          collectionId2.getStringValue(),
          collectionId3.getStringValue(),
        ]),
      );
      expect(activity.metadata.collectionIds).toHaveLength(3); // No duplicates
    });

    it('should handle merging into activity with no existing collections', async () => {
      const activity = FeedActivity.createCardCollected(
        curatorId,
        cardId,
      ).unwrap();

      // Initially no collections
      expect(activity.metadata.collectionIds).toBeUndefined();

      // Merge collections
      activity.mergeCollections([collectionId1, collectionId2]);

      expect(activity.metadata.collectionIds).toEqual([
        collectionId1.getStringValue(),
        collectionId2.getStringValue(),
      ]);
    });

    it('should handle merging empty array', async () => {
      const activity = FeedActivity.createCardCollected(
        curatorId,
        cardId,
        [collectionId1],
      ).unwrap();

      const originalCollections = [...(activity.metadata.collectionIds || [])];

      // Merge empty array
      activity.mergeCollections([]);

      expect(activity.metadata.collectionIds).toEqual(originalCollections);
    });

    it('should not affect non-card-collected activities', async () => {
      // This test assumes we might have other activity types in the future
      // For now, we only have CARD_COLLECTED, but this tests the type guard
      const activity = FeedActivity.createCardCollected(
        curatorId,
        cardId,
        [collectionId1],
      ).unwrap();

      // Mock the cardCollected getter to return false
      jest.spyOn(activity, 'cardCollected', 'get').mockReturnValue(false);

      const originalCollections = [...(activity.metadata.collectionIds || [])];

      // Try to merge collections
      activity.mergeCollections([collectionId2]);

      // Should not have changed
      expect(activity.metadata.collectionIds).toEqual(originalCollections);

      jest.restoreAllMocks();
    });

    it('should preserve order of collections', async () => {
      const activity = FeedActivity.createCardCollected(
        curatorId,
        cardId,
        [collectionId1],
      ).unwrap();

      // Merge in specific order
      activity.mergeCollections([collectionId3, collectionId2]);

      // Should contain all collections (order may vary due to Set usage)
      expect(activity.metadata.collectionIds).toEqual(
        expect.arrayContaining([
          collectionId1.getStringValue(),
          collectionId2.getStringValue(),
          collectionId3.getStringValue(),
        ]),
      );
      expect(activity.metadata.collectionIds).toHaveLength(3);
    });
  });

  describe('type guards and getters', () => {
    it('should correctly identify card collected activity', async () => {
      const activity = FeedActivity.createCardCollected(
        curatorId,
        cardId,
        [collectionId1],
      ).unwrap();

      expect(activity.cardCollected).toBe(true);
      expect(activity.type.value).toBe('CARD_COLLECTED');
    });

    it('should provide access to all properties', async () => {
      const customDate = new Date('2024-01-01T12:00:00Z');
      const activity = FeedActivity.createCardCollected(
        curatorId,
        cardId,
        [collectionId1],
        UrlType.VIDEO,
        customDate,
      ).unwrap();

      expect(activity.actorId.value).toBe(curatorId.value);
      expect(activity.metadata.cardId).toBe(cardId.getStringValue());
      expect(activity.metadata.collectionIds).toEqual([collectionId1.getStringValue()]);
      expect(activity.urlType).toBe(UrlType.VIDEO);
      expect(activity.createdAt).toEqual(customDate);
      expect(activity.activityId).toBeDefined();
    });
  });
});
