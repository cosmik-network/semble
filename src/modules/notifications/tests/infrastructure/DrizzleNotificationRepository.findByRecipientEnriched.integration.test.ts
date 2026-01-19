import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import postgres from 'postgres';
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DrizzleNotificationRepository } from '../../infrastructure/repositories/DrizzleNotificationRepository';
import { DrizzleCardRepository } from '../../../cards/infrastructure/repositories/DrizzleCardRepository';
import { DrizzleCollectionRepository } from '../../../cards/infrastructure/repositories/DrizzleCollectionRepository';
import { CuratorId } from '../../../cards/domain/value-objects/CuratorId';
import { UniqueEntityID } from '../../../../shared/domain/UniqueEntityID';
import { cards } from '../../../cards/infrastructure/repositories/schema/card.sql';
import {
  collections,
  collectionCards,
} from '../../../cards/infrastructure/repositories/schema/collection.sql';
import { libraryMemberships } from '../../../cards/infrastructure/repositories/schema/libraryMembership.sql';
import { publishedRecords } from '../../../cards/infrastructure/repositories/schema/publishedRecord.sql';
import { notifications } from '../../infrastructure/repositories/schema/notification.sql';
import {
  Collection,
  CollectionAccessType,
} from '../../../cards/domain/Collection';
import { CardBuilder } from '../../../cards/tests/utils/builders/CardBuilder';
import { URL } from '../../../cards/domain/value-objects/URL';
import { UrlMetadata } from '../../../cards/domain/value-objects/UrlMetadata';
import { createTestSchema } from '../../../cards/tests/test-utils/createTestSchema';
import { Notification } from '../../domain/Notification';
import { NotificationType, NotificationTypeEnum } from '../../domain/value-objects/NotificationType';
import { UrlType } from '../../../cards/domain/value-objects/UrlType';

describe('DrizzleNotificationRepository - findByRecipientEnriched', () => {
  let container: StartedPostgreSqlContainer;
  let db: PostgresJsDatabase;
  let notificationRepository: DrizzleNotificationRepository;
  let cardRepository: DrizzleCardRepository;
  let collectionRepository: DrizzleCollectionRepository;

  // Test data
  let recipientId: CuratorId;
  let actorId: CuratorId;
  let cardAuthorId: CuratorId;
  let collectionAuthorId: CuratorId;

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
    notificationRepository = new DrizzleNotificationRepository(db);
    cardRepository = new DrizzleCardRepository(db);
    collectionRepository = new DrizzleCollectionRepository(db);

    // Create schema using helper function
    await createTestSchema(db);

    // Create test data
    recipientId = CuratorId.create('did:plc:recipient').unwrap();
    actorId = CuratorId.create('did:plc:actor').unwrap();
    cardAuthorId = CuratorId.create('did:plc:cardauthor').unwrap();
    collectionAuthorId = CuratorId.create('did:plc:collectionauthor').unwrap();
  }, 60000); // Increase timeout for container startup

  // Cleanup after all tests
  afterAll(async () => {
    // Stop container
    await container.stop();
  });

  // Clear data between tests
  beforeEach(async () => {
    await db.delete(notifications);
    await db.delete(collectionCards);
    await db.delete(collections);
    await db.delete(libraryMemberships);
    await db.delete(cards);
    await db.delete(publishedRecords);
  });

  describe('findByRecipientEnriched', () => {
    it('should return empty result when no notifications exist', async () => {
      const result = await notificationRepository.findByRecipientEnriched(
        recipientId,
        { page: 1, limit: 10 },
      );

      expect(result.isOk()).toBe(true);
      const data = result.unwrap();
      expect(data.notifications).toEqual([]);
      expect(data.totalCount).toBe(0);
      expect(data.hasMore).toBe(false);
      expect(data.unreadCount).toBe(0);
    });

    it('should return enriched notification with card data', async () => {
      // Create URL card with metadata
      const url = URL.create('https://example.com/test-article').unwrap();
      const urlMetadata = UrlMetadata.create({
        url: url.value,
        title: 'Test Article',
        description: 'A test article description',
        author: 'John Doe',
        publishedDate: new Date('2024-01-15'),
        siteName: 'Example Site',
        imageUrl: 'https://example.com/image.jpg',
        type: UrlType.ARTICLE,
        doi: '10.1000/test',
        isbn: '978-0123456789',
      }).unwrap();

      const urlCard = new CardBuilder()
        .withCuratorId(cardAuthorId.value)
        .withUrlCard(url, urlMetadata)
        .buildOrThrow();

      await cardRepository.save(urlCard);

      // Add card to library to get library count
      urlCard.addToLibrary(cardAuthorId);
      await cardRepository.save(urlCard);

      // Create notification
      const notification = Notification.create({
        recipientUserId: recipientId,
        actorUserId: actorId,
        type: NotificationType.create(
          NotificationTypeEnum.USER_ADDED_YOUR_CARD,
        ).unwrap(),
        metadata: {
          cardId: urlCard.cardId.getStringValue(),
        },
        read: false,
        createdAt: new Date('2024-01-20'),
        updatedAt: new Date('2024-01-20'),
      }).unwrap();

      await notificationRepository.save(notification);

      const result = await notificationRepository.findByRecipientEnriched(
        recipientId,
        { page: 1, limit: 10 },
      );

      expect(result.isOk()).toBe(true);
      const data = result.unwrap();
      expect(data.notifications).toHaveLength(1);
      expect(data.totalCount).toBe(1);
      expect(data.hasMore).toBe(false);
      expect(data.unreadCount).toBe(1);

      const enrichedNotification = data.notifications[0]!;

      // Check notification data
      expect(enrichedNotification.id).toBe(
        notification.notificationId.getStringValue(),
      );
      expect(enrichedNotification.type).toBe(
        NotificationTypeEnum.USER_ADDED_YOUR_CARD,
      );
      expect(enrichedNotification.read).toBe(false);
      expect(enrichedNotification.actorUserId).toBe(actorId.value);
      expect(enrichedNotification.cardAuthorId).toBe(cardAuthorId.value);

      // Check card data
      expect(enrichedNotification.cardId).toBe(urlCard.cardId.getStringValue());
      expect(enrichedNotification.cardUrl).toBe(url.value);
      expect(enrichedNotification.cardTitle).toBe('Test Article');
      expect(enrichedNotification.cardDescription).toBe(
        'A test article description',
      );
      expect(enrichedNotification.cardAuthor).toBe('John Doe');
      expect(enrichedNotification.cardPublishedDate).toEqual(
        new Date('2024-01-15'),
      );
      expect(enrichedNotification.cardSiteName).toBe('Example Site');
      expect(enrichedNotification.cardImageUrl).toBe(
        'https://example.com/image.jpg',
      );
      expect(enrichedNotification.cardType).toBe('article');
      expect(enrichedNotification.cardDoi).toBe('10.1000/test');
      expect(enrichedNotification.cardIsbn).toBe('978-0123456789');
      expect(enrichedNotification.cardLibraryCount).toBe(1);
      expect(enrichedNotification.cardUrlLibraryCount).toBe(1);
      expect(enrichedNotification.collections).toEqual([]);
    });

    it('should include note card data when present', async () => {
      // Create URL card
      const url = URL.create('https://example.com/article-with-note').unwrap();
      const urlCard = new CardBuilder()
        .withCuratorId(cardAuthorId.value)
        .withUrlCard(url)
        .buildOrThrow();

      await cardRepository.save(urlCard);

      // Create note card connected to URL card
      const noteCard = new CardBuilder()
        .withCuratorId(cardAuthorId.value)
        .withNoteCard('This is my detailed analysis of the article.')
        .withParentCard(urlCard.cardId)
        .buildOrThrow();

      await cardRepository.save(noteCard);

      // Create notification
      const notification = Notification.create({
        recipientUserId: recipientId,
        actorUserId: actorId,
        type: NotificationType.create(
          NotificationTypeEnum.USER_ADDED_YOUR_CARD,
        ).unwrap(),
        metadata: {
          cardId: urlCard.cardId.getStringValue(),
        },
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).unwrap();

      await notificationRepository.save(notification);

      const result = await notificationRepository.findByRecipientEnriched(
        recipientId,
        { page: 1, limit: 10 },
      );

      expect(result.isOk()).toBe(true);
      const data = result.unwrap();
      expect(data.notifications).toHaveLength(1);

      const enrichedNotification = data.notifications[0]!;
      expect(enrichedNotification.cardNote).toBeDefined();
      expect(enrichedNotification.cardNote?.id).toBe(
        noteCard.cardId.getStringValue(),
      );
      expect(enrichedNotification.cardNote?.text).toBe(
        'This is my detailed analysis of the article.',
      );
    });

    it('should include collection data when card is in collections', async () => {
      // Create URL card
      const url = URL.create(
        'https://example.com/article-in-collections',
      ).unwrap();
      const urlCard = new CardBuilder()
        .withCuratorId(cardAuthorId.value)
        .withUrlCard(url)
        .buildOrThrow();

      await cardRepository.save(urlCard);

      // Create collections
      const collection1 = Collection.create(
        {
          authorId: collectionAuthorId,
          name: 'Reading List',
          description: 'Articles to read',
          accessType: CollectionAccessType.OPEN,
          collaboratorIds: [],
          createdAt: new Date('2024-01-10'),
          updatedAt: new Date('2024-01-15'),
        },
        new UniqueEntityID(),
      ).unwrap();

      const collection2 = Collection.create(
        {
          authorId: cardAuthorId,
          name: 'My Favorites',
          accessType: CollectionAccessType.CLOSED,
          collaboratorIds: [],
          createdAt: new Date('2024-01-12'),
          updatedAt: new Date('2024-01-18'),
        },
        new UniqueEntityID(),
      ).unwrap();

      // Add card to collections
      collection1.addCard(urlCard.cardId, collectionAuthorId);
      collection2.addCard(urlCard.cardId, cardAuthorId);

      await collectionRepository.save(collection1);
      await collectionRepository.save(collection2);

      // Create notification
      const notification = Notification.create({
        recipientUserId: recipientId,
        actorUserId: actorId,
        type: NotificationType.create(
          NotificationTypeEnum.USER_ADDED_YOUR_CARD,
        ).unwrap(),
        metadata: {
          cardId: urlCard.cardId.getStringValue(),
          collectionIds: [
            collection1.collectionId.getStringValue(),
            collection2.collectionId.getStringValue(),
          ],
        },
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).unwrap();

      await notificationRepository.save(notification);

      const result = await notificationRepository.findByRecipientEnriched(
        recipientId,
        { page: 1, limit: 10 },
      );

      expect(result.isOk()).toBe(true);
      const data = result.unwrap();
      expect(data.notifications).toHaveLength(1);

      const enrichedNotification = data.notifications[0]!;
      expect(enrichedNotification.collections).toHaveLength(2);

      // Check collection data
      const collectionNames = enrichedNotification.collections
        .map((c) => c.name)
        .sort();
      expect(collectionNames).toEqual(['My Favorites', 'Reading List']);

      const readingList = enrichedNotification.collections.find(
        (c) => c.name === 'Reading List',
      );
      expect(readingList?.id).toBe(collection1.collectionId.getStringValue());
      expect(readingList?.description).toBe('Articles to read');
      expect(readingList?.authorId).toBe(collectionAuthorId.value);
      expect(readingList?.cardCount).toBe(1);
      expect(readingList?.createdAt).toEqual(new Date('2024-01-10'));
      expect(readingList?.updatedAt).toEqual(new Date('2024-01-15'));

      const myFavorites = enrichedNotification.collections.find(
        (c) => c.name === 'My Favorites',
      );
      expect(myFavorites?.id).toBe(collection2.collectionId.getStringValue());
      expect(myFavorites?.description).toBeUndefined();
      expect(myFavorites?.authorId).toBe(cardAuthorId.value);
    });

    it('should calculate URL library count correctly', async () => {
      // Create URL card
      const url = URL.create('https://example.com/popular-article').unwrap();
      const urlCard1 = new CardBuilder()
        .withCuratorId(cardAuthorId.value)
        .withUrlCard(url)
        .buildOrThrow();

      // Create another card with the same URL by different user
      const urlCard2 = new CardBuilder()
        .withCuratorId(actorId.value)
        .withUrlCard(url)
        .buildOrThrow();

      await cardRepository.save(urlCard1);
      await cardRepository.save(urlCard2);

      // Add both cards to their respective libraries
      urlCard1.addToLibrary(cardAuthorId);
      urlCard2.addToLibrary(actorId);
      await cardRepository.save(urlCard1);
      await cardRepository.save(urlCard2);

      // Create notification for the first card
      const notification = Notification.create({
        recipientUserId: recipientId,
        actorUserId: actorId,
        type: NotificationType.create(
          NotificationTypeEnum.USER_ADDED_YOUR_CARD,
        ).unwrap(),
        metadata: {
          cardId: urlCard1.cardId.getStringValue(),
        },
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).unwrap();

      await notificationRepository.save(notification);

      const result = await notificationRepository.findByRecipientEnriched(
        recipientId,
        { page: 1, limit: 10 },
      );

      expect(result.isOk()).toBe(true);
      const data = result.unwrap();
      expect(data.notifications).toHaveLength(1);

      const enrichedNotification = data.notifications[0]!;
      expect(enrichedNotification.cardLibraryCount).toBe(1); // Individual card library count
      expect(enrichedNotification.cardUrlLibraryCount).toBe(2); // URL appears in 2 different users' libraries
    });

    it('should handle pagination correctly', async () => {
      // Create multiple URL cards and notifications
      const notifications = [];
      for (let i = 1; i <= 5; i++) {
        const url = URL.create(`https://example.com/article-${i}`).unwrap();
        const urlCard = new CardBuilder()
          .withCuratorId(cardAuthorId.value)
          .withUrlCard(url)
          .buildOrThrow();

        await cardRepository.save(urlCard);

        const notification = Notification.create({
          recipientUserId: recipientId,
          actorUserId: actorId,
          type: NotificationType.create(
            NotificationTypeEnum.USER_ADDED_YOUR_CARD,
          ).unwrap(),
          metadata: {
            cardId: urlCard.cardId.getStringValue(),
          },
          read: i % 2 === 0, // Make some read, some unread
          createdAt: new Date(2024, 0, i), // Different dates for ordering
          updatedAt: new Date(2024, 0, i),
        }).unwrap();

        await notificationRepository.save(notification);
        notifications.push(notification);
      }

      // Test first page
      const page1Result = await notificationRepository.findByRecipientEnriched(
        recipientId,
        { page: 1, limit: 2 },
      );

      expect(page1Result.isOk()).toBe(true);
      const page1Data = page1Result.unwrap();
      expect(page1Data.notifications).toHaveLength(2);
      expect(page1Data.totalCount).toBe(5);
      expect(page1Data.hasMore).toBe(true);
      expect(page1Data.unreadCount).toBe(3); // Notifications 1, 3, 5 are unread

      // Test second page
      const page2Result = await notificationRepository.findByRecipientEnriched(
        recipientId,
        { page: 2, limit: 2 },
      );

      expect(page2Result.isOk()).toBe(true);
      const page2Data = page2Result.unwrap();
      expect(page2Data.notifications).toHaveLength(2);
      expect(page2Data.totalCount).toBe(5);
      expect(page2Data.hasMore).toBe(true);

      // Test last page
      const page3Result = await notificationRepository.findByRecipientEnriched(
        recipientId,
        { page: 3, limit: 2 },
      );

      expect(page3Result.isOk()).toBe(true);
      const page3Data = page3Result.unwrap();
      expect(page3Data.notifications).toHaveLength(1);
      expect(page3Data.totalCount).toBe(5);
      expect(page3Data.hasMore).toBe(false);
    });

    it('should filter by unread only when requested', async () => {
      // Create notifications with different read states
      for (let i = 1; i <= 4; i++) {
        const url = URL.create(`https://example.com/article-${i}`).unwrap();
        const urlCard = new CardBuilder()
          .withCuratorId(cardAuthorId.value)
          .withUrlCard(url)
          .buildOrThrow();

        await cardRepository.save(urlCard);

        const notification = Notification.create({
          recipientUserId: recipientId,
          actorUserId: actorId,
          type: NotificationType.create(
            NotificationTypeEnum.USER_ADDED_YOUR_CARD,
          ).unwrap(),
          metadata: {
            cardId: urlCard.cardId.getStringValue(),
          },
          read: i <= 2, // First 2 are read, last 2 are unread
          createdAt: new Date(2024, 0, i),
          updatedAt: new Date(2024, 0, i),
        }).unwrap();

        await notificationRepository.save(notification);
      }

      // Test all notifications
      const allResult = await notificationRepository.findByRecipientEnriched(
        recipientId,
        { page: 1, limit: 10 },
      );

      expect(allResult.isOk()).toBe(true);
      const allData = allResult.unwrap();
      expect(allData.notifications).toHaveLength(4);
      expect(allData.totalCount).toBe(4);
      expect(allData.unreadCount).toBe(2);

      // Test unread only
      const unreadResult = await notificationRepository.findByRecipientEnriched(
        recipientId,
        { page: 1, limit: 10, unreadOnly: true },
      );

      expect(unreadResult.isOk()).toBe(true);
      const unreadData = unreadResult.unwrap();
      expect(unreadData.notifications).toHaveLength(2);
      expect(unreadData.totalCount).toBe(2);
      expect(unreadData.unreadCount).toBe(2);

      // Verify all returned notifications are unread
      unreadData.notifications.forEach((notification) => {
        expect(notification.read).toBe(false);
      });
    });

    it('should handle notifications with missing card data gracefully', async () => {
      // Create notification with non-existent card ID
      const notification = Notification.create({
        recipientUserId: recipientId,
        actorUserId: actorId,
        type: NotificationType.create(
          NotificationTypeEnum.USER_ADDED_YOUR_CARD,
        ).unwrap(),
        metadata: {
          cardId: new UniqueEntityID().toString(), // Non-existent card
        },
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).unwrap();

      await notificationRepository.save(notification);

      const result = await notificationRepository.findByRecipientEnriched(
        recipientId,
        { page: 1, limit: 10 },
      );

      expect(result.isOk()).toBe(true);
      const data = result.unwrap();
      // Should skip notifications with missing card data
      expect(data.notifications).toHaveLength(0);
      expect(data.totalCount).toBe(1); // Total count includes the notification
      expect(data.unreadCount).toBe(1);
    });

    it('should order notifications by creation date descending', async () => {
      // Create notifications with different creation dates
      const dates = [
        new Date('2024-01-15'),
        new Date('2024-01-10'),
        new Date('2024-01-20'),
        new Date('2024-01-12'),
      ];

      for (let i = 0; i < dates.length; i++) {
        const url = URL.create(`https://example.com/article-${i}`).unwrap();
        const urlCard = new CardBuilder()
          .withCuratorId(cardAuthorId.value)
          .withUrlCard(url)
          .buildOrThrow();

        await cardRepository.save(urlCard);

        const notification = Notification.create({
          recipientUserId: recipientId,
          actorUserId: actorId,
          type: NotificationType.create(
            NotificationTypeEnum.USER_ADDED_YOUR_CARD,
          ).unwrap(),
          metadata: {
            cardId: urlCard.cardId.getStringValue(),
          },
          read: false,
          createdAt: dates[i]!,
          updatedAt: dates[i]!,
        }).unwrap();

        await notificationRepository.save(notification);
      }

      const result = await notificationRepository.findByRecipientEnriched(
        recipientId,
        { page: 1, limit: 10 },
      );

      expect(result.isOk()).toBe(true);
      const data = result.unwrap();
      expect(data.notifications).toHaveLength(4);

      // Should be ordered by creation date descending (newest first)
      const createdDates = data.notifications.map((n) => n.createdAt.getTime());
      expect(createdDates).toEqual([
        new Date('2024-01-20').getTime(),
        new Date('2024-01-15').getTime(),
        new Date('2024-01-12').getTime(),
        new Date('2024-01-10').getTime(),
      ]);
    });

    it('should only return notifications for the specified recipient', async () => {
      const otherRecipientId = CuratorId.create(
        'did:plc:otherrecipient',
      ).unwrap();

      // Create notifications for different recipients
      for (const recipient of [recipientId, otherRecipientId]) {
        const url = URL.create(
          `https://example.com/article-${recipient.value}`,
        ).unwrap();
        const urlCard = new CardBuilder()
          .withCuratorId(cardAuthorId.value)
          .withUrlCard(url)
          .buildOrThrow();

        await cardRepository.save(urlCard);

        const notification = Notification.create({
          recipientUserId: recipient,
          actorUserId: actorId,
          type: NotificationType.create(
            NotificationTypeEnum.USER_ADDED_YOUR_CARD,
          ).unwrap(),
          metadata: {
            cardId: urlCard.cardId.getStringValue(),
          },
          read: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }).unwrap();

        await notificationRepository.save(notification);
      }

      // Query for specific recipient
      const result = await notificationRepository.findByRecipientEnriched(
        recipientId,
        { page: 1, limit: 10 },
      );

      expect(result.isOk()).toBe(true);
      const data = result.unwrap();
      expect(data.notifications).toHaveLength(1);
      expect(data.totalCount).toBe(1);
      expect(data.unreadCount).toBe(1);

      // Verify it's the correct notification
      expect(data.notifications[0]?.cardUrl).toBe(
        `https://example.com/article-${recipientId.value}`,
      );
    });
  });
});
