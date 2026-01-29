import { CreateNotificationUseCase } from '../../application/useCases/commands/CreateNotificationUseCase';
import { InMemoryNotificationRepository } from '../infrastructure/InMemoryNotificationRepository';
import { NotificationService } from '../../domain/services/NotificationService';
import { CuratorId } from '../../../cards/domain/value-objects/CuratorId';
import { CardId } from '../../../cards/domain/value-objects/CardId';
import { CollectionId } from '../../../cards/domain/value-objects/CollectionId';
import { NotificationId } from '../../domain/value-objects/NotificationId';
import { NotificationType } from '@semble/types';

describe('CreateNotificationUseCase', () => {
  let useCase: CreateNotificationUseCase;
  let notificationRepository: InMemoryNotificationRepository;
  let notificationService: NotificationService;

  // Test data
  let recipientId: CuratorId;
  let actorId: CuratorId;
  let cardId: CardId;
  let collectionId: CollectionId;

  beforeEach(() => {
    // Initialize repository and services
    notificationRepository = InMemoryNotificationRepository.getInstance();
    notificationService = new NotificationService(notificationRepository);
    useCase = new CreateNotificationUseCase(notificationService);

    // Create test data
    recipientId = CuratorId.create('did:plc:recipient123').unwrap();
    actorId = CuratorId.create('did:plc:actor456').unwrap();
    cardId = CardId.createFromString('test-card-id-789').unwrap();
    collectionId = CollectionId.createFromString(
      'test-collection-id-abc',
    ).unwrap();
  });

  afterEach(() => {
    // Clean up repository between tests
    InMemoryNotificationRepository.resetInstance();
  });

  describe('USER_ADDED_YOUR_CARD notifications', () => {
    it('should successfully create notification with required fields only', async () => {
      const request = {
        type: NotificationType.USER_ADDED_YOUR_CARD as const,
        recipientUserId: recipientId.value,
        actorUserId: actorId.value,
        cardId: cardId.getStringValue(),
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.notificationId).toBeDefined();
      expect(typeof response.notificationId).toBe('string');
    });

    it('should successfully create notification with collection IDs', async () => {
      const collection2Id = CollectionId.createFromString(
        'test-collection-id-2',
      ).unwrap();

      const request = {
        type: NotificationType.USER_ADDED_YOUR_CARD as const,
        recipientUserId: recipientId.value,
        actorUserId: actorId.value,
        cardId: cardId.getStringValue(),
        collectionIds: [
          collectionId.getStringValue(),
          collection2Id.getStringValue(),
        ],
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.notificationId).toBeDefined();
    });

    it('should save notification to repository', async () => {
      const request = {
        type: NotificationType.USER_ADDED_YOUR_CARD as const,
        recipientUserId: recipientId.value,
        actorUserId: actorId.value,
        cardId: cardId.getStringValue(),
      };

      const result = await useCase.execute(request);
      expect(result.isOk()).toBe(true);

      const response = result.unwrap();

      // Verify notification was saved
      const notificationId = NotificationId.createFromString(
        response.notificationId,
      ).unwrap();
      const savedNotification =
        await notificationRepository.findById(notificationId);

      expect(savedNotification.isOk()).toBe(true);
      expect(savedNotification.unwrap()).toBeDefined();

      const notification = savedNotification.unwrap();
      expect(notification?.recipientUserId.value).toBe(recipientId.value);
      expect(notification?.actorUserId.value).toBe(actorId.value);
      expect(notification?.metadata.cardId).toBe(cardId.getStringValue());
      expect(notification?.type.value).toBe(
        NotificationType.USER_ADDED_YOUR_CARD,
      );
      expect(notification?.read).toBe(false);
    });

    it('should store collection IDs in metadata when provided', async () => {
      const request = {
        type: NotificationType.USER_ADDED_YOUR_CARD as const,
        recipientUserId: recipientId.value,
        actorUserId: actorId.value,
        cardId: cardId.getStringValue(),
        collectionIds: [collectionId.getStringValue()],
      };

      const result = await useCase.execute(request);
      expect(result.isOk()).toBe(true);

      const response = result.unwrap();
      const notificationId = NotificationId.createFromString(
        response.notificationId,
      ).unwrap();
      const savedNotification =
        await notificationRepository.findById(notificationId);

      const notification = savedNotification.unwrap();
      expect(notification?.metadata.collectionIds).toEqual([
        collectionId.getStringValue(),
      ]);
    });

    it('should handle empty collection IDs array', async () => {
      const request = {
        type: NotificationType.USER_ADDED_YOUR_CARD as const,
        recipientUserId: recipientId.value,
        actorUserId: actorId.value,
        cardId: cardId.getStringValue(),
        collectionIds: [],
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);
    });

    it('should be retrievable via findByRecipient', async () => {
      const request = {
        type: NotificationType.USER_ADDED_YOUR_CARD as const,
        recipientUserId: recipientId.value,
        actorUserId: actorId.value,
        cardId: cardId.getStringValue(),
      };

      await useCase.execute(request);

      // Retrieve notifications for recipient
      const notifications = await notificationRepository.findByRecipient(
        recipientId,
        { page: 1, limit: 10, unreadOnly: false },
      );

      expect(notifications.isOk()).toBe(true);
      const data = notifications.unwrap();
      expect(data.notifications).toHaveLength(1);
      expect(data.notifications[0]?.type.value).toBe(
        NotificationType.USER_ADDED_YOUR_CARD,
      );
    });
  });

  describe('USER_ADDED_TO_YOUR_COLLECTION notifications', () => {
    it('should successfully create notification', async () => {
      const request = {
        type: NotificationType.USER_ADDED_TO_YOUR_COLLECTION as const,
        recipientUserId: recipientId.value,
        actorUserId: actorId.value,
        cardId: cardId.getStringValue(),
        collectionId: collectionId.getStringValue(),
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.notificationId).toBeDefined();
    });

    it('should save notification with correct type', async () => {
      const request = {
        type: NotificationType.USER_ADDED_TO_YOUR_COLLECTION as const,
        recipientUserId: recipientId.value,
        actorUserId: actorId.value,
        cardId: cardId.getStringValue(),
        collectionId: collectionId.getStringValue(),
      };

      const result = await useCase.execute(request);
      expect(result.isOk()).toBe(true);

      const response = result.unwrap();
      const notificationId = NotificationId.createFromString(
        response.notificationId,
      ).unwrap();
      const savedNotification =
        await notificationRepository.findById(notificationId);

      const notification = savedNotification.unwrap();
      expect(notification?.type.value).toBe(
        NotificationType.USER_ADDED_TO_YOUR_COLLECTION,
      );
      expect(notification?.recipientUserId.value).toBe(recipientId.value);
      expect(notification?.actorUserId.value).toBe(actorId.value);
    });

    it('should store single collection ID in metadata array', async () => {
      const request = {
        type: NotificationType.USER_ADDED_TO_YOUR_COLLECTION as const,
        recipientUserId: recipientId.value,
        actorUserId: actorId.value,
        cardId: cardId.getStringValue(),
        collectionId: collectionId.getStringValue(),
      };

      const result = await useCase.execute(request);
      expect(result.isOk()).toBe(true);

      const response = result.unwrap();
      const notificationId = NotificationId.createFromString(
        response.notificationId,
      ).unwrap();
      const savedNotification =
        await notificationRepository.findById(notificationId);

      const notification = savedNotification.unwrap();
      expect(notification?.metadata.cardId).toBe(cardId.getStringValue());
      expect(notification?.metadata.collectionIds).toEqual([
        collectionId.getStringValue(),
      ]);
    });

    it('should be retrievable via findByRecipient', async () => {
      const request = {
        type: NotificationType.USER_ADDED_TO_YOUR_COLLECTION as const,
        recipientUserId: recipientId.value,
        actorUserId: actorId.value,
        cardId: cardId.getStringValue(),
        collectionId: collectionId.getStringValue(),
      };

      await useCase.execute(request);

      const notifications = await notificationRepository.findByRecipient(
        recipientId,
        { page: 1, limit: 10, unreadOnly: false },
      );

      expect(notifications.isOk()).toBe(true);
      const data = notifications.unwrap();
      expect(data.notifications).toHaveLength(1);
      expect(data.notifications[0]?.type.value).toBe(
        NotificationType.USER_ADDED_TO_YOUR_COLLECTION,
      );
    });
  });

  describe('Validation', () => {
    describe('Invalid recipient ID', () => {
      it('should fail with empty recipient ID', async () => {
        const request = {
          type: NotificationType.USER_ADDED_YOUR_CARD as const,
          recipientUserId: '',
          actorUserId: actorId.value,
          cardId: cardId.getStringValue(),
        };

        const result = await useCase.execute(request);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Invalid recipient ID');
        }
      });

      it('should fail with malformed recipient DID', async () => {
        const request = {
          type: NotificationType.USER_ADDED_YOUR_CARD as const,
          recipientUserId: 'not-a-did',
          actorUserId: actorId.value,
          cardId: cardId.getStringValue(),
        };

        const result = await useCase.execute(request);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Invalid recipient ID');
        }
      });
    });

    describe('Invalid actor ID', () => {
      it('should fail with empty actor ID', async () => {
        const request = {
          type: NotificationType.USER_ADDED_YOUR_CARD as const,
          recipientUserId: recipientId.value,
          actorUserId: '',
          cardId: cardId.getStringValue(),
        };

        const result = await useCase.execute(request);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Invalid actor ID');
        }
      });

      it('should fail with malformed actor DID', async () => {
        const request = {
          type: NotificationType.USER_ADDED_YOUR_CARD as const,
          recipientUserId: recipientId.value,
          actorUserId: 'invalid-did-format',
          cardId: cardId.getStringValue(),
        };

        const result = await useCase.execute(request);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Invalid actor ID');
        }
      });
    });

    describe('Invalid card ID', () => {
      it('should accept empty card ID (CardId validation allows it)', async () => {
        // Note: CardId.createFromString only checks null/undefined, not empty strings
        const request = {
          type: NotificationType.USER_ADDED_YOUR_CARD as const,
          recipientUserId: recipientId.value,
          actorUserId: actorId.value,
          cardId: '',
        };

        const result = await useCase.execute(request);

        // CardId accepts empty strings, so this succeeds
        expect(result.isOk()).toBe(true);
      });
    });

    describe('Invalid collection IDs (USER_ADDED_YOUR_CARD)', () => {
      it('should accept empty collection ID in array (CollectionId validation allows it)', async () => {
        // Note: CollectionId.createFromString only checks null/undefined, not empty strings
        const request = {
          type: NotificationType.USER_ADDED_YOUR_CARD as const,
          recipientUserId: recipientId.value,
          actorUserId: actorId.value,
          cardId: cardId.getStringValue(),
          collectionIds: ['valid-id', ''], // Empty string is technically valid
        };

        const result = await useCase.execute(request);

        // CollectionId accepts empty strings, so this succeeds
        expect(result.isOk()).toBe(true);
      });
    });

    describe('Invalid collection ID (USER_ADDED_TO_YOUR_COLLECTION)', () => {
      it('should accept empty collection ID (CollectionId validation allows it)', async () => {
        // Note: CollectionId.createFromString only checks null/undefined, not empty strings
        const request = {
          type: NotificationType.USER_ADDED_TO_YOUR_COLLECTION as const,
          recipientUserId: recipientId.value,
          actorUserId: actorId.value,
          cardId: cardId.getStringValue(),
          collectionId: '',
        };

        const result = await useCase.execute(request);

        // CollectionId accepts empty strings, so this succeeds
        expect(result.isOk()).toBe(true);
      });
    });
  });

  describe('Business rules', () => {
    describe('Self-notification prevention', () => {
      it('should not create USER_ADDED_YOUR_CARD notification when recipient equals actor', async () => {
        const samePerson = CuratorId.create('did:plc:sameperson').unwrap();

        const request = {
          type: NotificationType.USER_ADDED_YOUR_CARD as const,
          recipientUserId: samePerson.value,
          actorUserId: samePerson.value,
          cardId: cardId.getStringValue(),
        };

        const result = await useCase.execute(request);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain(
            'Cannot notify user about their own action',
          );
        }
      });

      it('should not create USER_ADDED_TO_YOUR_COLLECTION notification when recipient equals actor', async () => {
        const samePerson = CuratorId.create('did:plc:sameperson').unwrap();

        const request = {
          type: NotificationType.USER_ADDED_TO_YOUR_COLLECTION as const,
          recipientUserId: samePerson.value,
          actorUserId: samePerson.value,
          cardId: cardId.getStringValue(),
          collectionId: collectionId.getStringValue(),
        };

        const result = await useCase.execute(request);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain(
            'Cannot notify user about their own action',
          );
        }
      });

      it('should create notification when recipient and actor are different', async () => {
        const request = {
          type: NotificationType.USER_ADDED_YOUR_CARD as const,
          recipientUserId: recipientId.value,
          actorUserId: actorId.value,
          cardId: cardId.getStringValue(),
        };

        const result = await useCase.execute(request);

        expect(result.isOk()).toBe(true);
      });
    });
  });

  describe('Multiple notifications', () => {
    it('should create multiple notifications for same recipient', async () => {
      const card1 = CardId.createFromString('card-1').unwrap();
      const card2 = CardId.createFromString('card-2').unwrap();

      const request1 = {
        type: NotificationType.USER_ADDED_YOUR_CARD as const,
        recipientUserId: recipientId.value,
        actorUserId: actorId.value,
        cardId: card1.getStringValue(),
      };

      const request2 = {
        type: NotificationType.USER_ADDED_YOUR_CARD as const,
        recipientUserId: recipientId.value,
        actorUserId: actorId.value,
        cardId: card2.getStringValue(),
      };

      const result1 = await useCase.execute(request1);
      const result2 = await useCase.execute(request2);

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      // Verify both notifications exist
      const notifications = await notificationRepository.findByRecipient(
        recipientId,
        { page: 1, limit: 10, unreadOnly: false },
      );

      expect(notifications.isOk()).toBe(true);
      const data = notifications.unwrap();
      expect(data.notifications).toHaveLength(2);
      expect(data.totalCount).toBe(2);
    });

    it('should create different notification types for same recipient', async () => {
      const request1 = {
        type: NotificationType.USER_ADDED_YOUR_CARD as const,
        recipientUserId: recipientId.value,
        actorUserId: actorId.value,
        cardId: cardId.getStringValue(),
      };

      const request2 = {
        type: NotificationType.USER_ADDED_TO_YOUR_COLLECTION as const,
        recipientUserId: recipientId.value,
        actorUserId: actorId.value,
        cardId: cardId.getStringValue(),
        collectionId: collectionId.getStringValue(),
      };

      const result1 = await useCase.execute(request1);
      const result2 = await useCase.execute(request2);

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      const notifications = await notificationRepository.findByRecipient(
        recipientId,
        { page: 1, limit: 10, unreadOnly: false },
      );

      expect(notifications.isOk()).toBe(true);
      const data = notifications.unwrap();
      expect(data.notifications).toHaveLength(2);

      // Verify different types
      const types = data.notifications.map((n) => n.type.value).sort();
      expect(types).toEqual([
        NotificationType.USER_ADDED_TO_YOUR_COLLECTION,
        NotificationType.USER_ADDED_YOUR_CARD,
      ]);
    });
  });

  describe('Repository integration', () => {
    it('should return same notification ID on repeated findById calls', async () => {
      const request = {
        type: NotificationType.USER_ADDED_YOUR_CARD as const,
        recipientUserId: recipientId.value,
        actorUserId: actorId.value,
        cardId: cardId.getStringValue(),
      };

      const result = await useCase.execute(request);
      expect(result.isOk()).toBe(true);

      const response = result.unwrap();
      const notificationId = NotificationId.createFromString(
        response.notificationId,
      ).unwrap();

      // Find multiple times
      const found1 = await notificationRepository.findById(notificationId);
      const found2 = await notificationRepository.findById(notificationId);

      expect(found1.unwrap()?.notificationId.getValue()).toEqual(
        found2.unwrap()?.notificationId.getValue(),
      );
    });

    it('should handle clean repository state after reset', async () => {
      const request = {
        type: NotificationType.USER_ADDED_YOUR_CARD as const,
        recipientUserId: recipientId.value,
        actorUserId: actorId.value,
        cardId: cardId.getStringValue(),
      };

      await useCase.execute(request);

      // Reset repository
      InMemoryNotificationRepository.resetInstance();
      notificationRepository = InMemoryNotificationRepository.getInstance();
      notificationService = new NotificationService(notificationRepository);
      useCase = new CreateNotificationUseCase(notificationService);

      // Verify repository is clean
      const notifications = await notificationRepository.findByRecipient(
        recipientId,
        { page: 1, limit: 10, unreadOnly: false },
      );

      expect(notifications.isOk()).toBe(true);
      const data = notifications.unwrap();
      expect(data.notifications).toHaveLength(0);
      expect(data.totalCount).toBe(0);
    });
  });
});
