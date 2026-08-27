import { Result, ok, err } from '../../../../shared/core/Result';
import { DomainService } from '../../../../shared/domain/DomainService';
import { Notification } from '../Notification';
import { INotificationRepository } from '../INotificationRepository';
import { CuratorId } from '../../../cards/domain/value-objects/CuratorId';
import { CardId } from '../../../cards/domain/value-objects/CardId';
import { CollectionId } from '../../../cards/domain/value-objects/CollectionId';
import { ConnectionId } from '../../../cards/domain/value-objects/ConnectionId';

export class NotificationServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotificationServiceError';
  }
}

export class NotificationService implements DomainService {
  constructor(private notificationRepository: INotificationRepository) {}

  async createUserAddedYourCardNotification(
    recipientUserId: CuratorId,
    actorUserId: CuratorId,
    cardId: CardId,
    collectionIds?: CollectionId[],
  ): Promise<Result<Notification, NotificationServiceError>> {
    try {
      // Don't create notification if user is adding their own card
      if (recipientUserId.equals(actorUserId)) {
        return err(
          new NotificationServiceError(
            'Cannot notify user about their own action',
          ),
        );
      }

      const notificationResult = Notification.createUserAddedYourCard(
        recipientUserId,
        actorUserId,
        cardId,
        collectionIds,
      );

      if (notificationResult.isErr()) {
        return err(
          new NotificationServiceError(notificationResult.error.message),
        );
      }

      const notification = notificationResult.value;
      const saveResult = await this.notificationRepository.save(notification);

      if (saveResult.isErr()) {
        return err(
          new NotificationServiceError(
            `Failed to save notification: ${saveResult.error.message}`,
          ),
        );
      }

      return ok(notification);
    } catch (error) {
      return err(
        new NotificationServiceError(
          `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }

  async createUserAddedToYourCollectionNotification(
    recipientUserId: CuratorId,
    actorUserId: CuratorId,
    cardId: CardId,
    collectionId: CollectionId,
  ): Promise<Result<Notification, NotificationServiceError>> {
    try {
      // Don't create notification if user is adding to their own collection
      if (recipientUserId.equals(actorUserId)) {
        return err(
          new NotificationServiceError(
            'Cannot notify user about their own action',
          ),
        );
      }

      const notificationResult = Notification.createUserAddedToYourCollection(
        recipientUserId,
        actorUserId,
        cardId,
        collectionId,
      );

      if (notificationResult.isErr()) {
        return err(
          new NotificationServiceError(notificationResult.error.message),
        );
      }

      const notification = notificationResult.value;
      const saveResult = await this.notificationRepository.save(notification);

      if (saveResult.isErr()) {
        return err(
          new NotificationServiceError(
            `Failed to save notification: ${saveResult.error.message}`,
          ),
        );
      }

      return ok(notification);
    } catch (error) {
      return err(
        new NotificationServiceError(
          `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }

  async createUserFollowedYouNotification(
    recipientUserId: CuratorId,
    actorUserId: CuratorId,
  ): Promise<Result<Notification, NotificationServiceError>> {
    try {
      // Don't create notification if user is following themselves (shouldn't happen)
      if (recipientUserId.equals(actorUserId)) {
        return err(
          new NotificationServiceError(
            'Cannot notify user about their own action',
          ),
        );
      }

      const notificationResult = Notification.createUserFollowedYou(
        recipientUserId,
        actorUserId,
      );

      if (notificationResult.isErr()) {
        return err(
          new NotificationServiceError(notificationResult.error.message),
        );
      }

      const notification = notificationResult.value;
      const saveResult = await this.notificationRepository.save(notification);

      if (saveResult.isErr()) {
        return err(
          new NotificationServiceError(
            `Failed to save notification: ${saveResult.error.message}`,
          ),
        );
      }

      return ok(notification);
    } catch (error) {
      return err(
        new NotificationServiceError(
          `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }

  async createUserFollowedYourCollectionNotification(
    recipientUserId: CuratorId,
    actorUserId: CuratorId,
    collectionId: CollectionId,
  ): Promise<Result<Notification, NotificationServiceError>> {
    try {
      // Don't create notification if user is following their own collection
      if (recipientUserId.equals(actorUserId)) {
        return err(
          new NotificationServiceError(
            'Cannot notify user about their own action',
          ),
        );
      }

      const notificationResult = Notification.createUserFollowedYourCollection(
        recipientUserId,
        actorUserId,
        collectionId,
      );

      if (notificationResult.isErr()) {
        return err(
          new NotificationServiceError(notificationResult.error.message),
        );
      }

      const notification = notificationResult.value;
      const saveResult = await this.notificationRepository.save(notification);

      if (saveResult.isErr()) {
        return err(
          new NotificationServiceError(
            `Failed to save notification: ${saveResult.error.message}`,
          ),
        );
      }

      return ok(notification);
    } catch (error) {
      return err(
        new NotificationServiceError(
          `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }

  async createUserAddedYourBskyPostNotification(
    recipientUserId: CuratorId,
    actorUserId: CuratorId,
    cardId: CardId,
    collectionIds?: CollectionId[],
  ): Promise<Result<Notification, NotificationServiceError>> {
    try {
      // Don't create notification if user is adding their own post
      if (recipientUserId.equals(actorUserId)) {
        return err(
          new NotificationServiceError(
            'Cannot notify user about their own action',
          ),
        );
      }

      const notificationResult = Notification.createUserAddedYourBskyPost(
        recipientUserId,
        actorUserId,
        cardId,
        collectionIds,
      );

      if (notificationResult.isErr()) {
        return err(
          new NotificationServiceError(notificationResult.error.message),
        );
      }

      const notification = notificationResult.value;
      const saveResult = await this.notificationRepository.save(notification);

      if (saveResult.isErr()) {
        return err(
          new NotificationServiceError(
            `Failed to save notification: ${saveResult.error.message}`,
          ),
        );
      }

      return ok(notification);
    } catch (error) {
      return err(
        new NotificationServiceError(
          `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }

  async createUserAddedYourCollectionNotification(
    recipientUserId: CuratorId,
    actorUserId: CuratorId,
    cardId: CardId,
    collectionIds?: CollectionId[],
  ): Promise<Result<Notification, NotificationServiceError>> {
    try {
      // Don't create notification if user is adding their own collection
      if (recipientUserId.equals(actorUserId)) {
        return err(
          new NotificationServiceError(
            'Cannot notify user about their own action',
          ),
        );
      }

      const notificationResult = Notification.createUserAddedYourCollection(
        recipientUserId,
        actorUserId,
        cardId,
        collectionIds,
      );

      if (notificationResult.isErr()) {
        return err(
          new NotificationServiceError(notificationResult.error.message),
        );
      }

      const notification = notificationResult.value;
      const saveResult = await this.notificationRepository.save(notification);

      if (saveResult.isErr()) {
        return err(
          new NotificationServiceError(
            `Failed to save notification: ${saveResult.error.message}`,
          ),
        );
      }

      return ok(notification);
    } catch (error) {
      return err(
        new NotificationServiceError(
          `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }

  async createUserConnectedYourUrlNotification(
    recipientUserId: CuratorId,
    actorUserId: CuratorId,
    connectionId: ConnectionId,
  ): Promise<Result<Notification, NotificationServiceError>> {
    try {
      // Don't create notification if user is connecting their own URLs
      if (recipientUserId.equals(actorUserId)) {
        return err(
          new NotificationServiceError(
            'Cannot notify user about their own action',
          ),
        );
      }

      const notificationResult = Notification.createUserConnectedYourUrl(
        recipientUserId,
        actorUserId,
        connectionId,
      );

      if (notificationResult.isErr()) {
        return err(
          new NotificationServiceError(notificationResult.error.message),
        );
      }

      const notification = notificationResult.value;
      const saveResult = await this.notificationRepository.save(notification);

      if (saveResult.isErr()) {
        return err(
          new NotificationServiceError(
            `Failed to save notification: ${saveResult.error.message}`,
          ),
        );
      }

      return ok(notification);
    } catch (error) {
      return err(
        new NotificationServiceError(
          `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }

  async createUserConnectedYourPostNotification(
    recipientUserId: CuratorId,
    actorUserId: CuratorId,
    connectionId: ConnectionId,
  ): Promise<Result<Notification, NotificationServiceError>> {
    try {
      // Don't create notification if user is connecting their own post
      if (recipientUserId.equals(actorUserId)) {
        return err(
          new NotificationServiceError(
            'Cannot notify user about their own action',
          ),
        );
      }

      const notificationResult = Notification.createUserConnectedYourPost(
        recipientUserId,
        actorUserId,
        connectionId,
      );

      if (notificationResult.isErr()) {
        return err(
          new NotificationServiceError(notificationResult.error.message),
        );
      }

      const notification = notificationResult.value;
      const saveResult = await this.notificationRepository.save(notification);

      if (saveResult.isErr()) {
        return err(
          new NotificationServiceError(
            `Failed to save notification: ${saveResult.error.message}`,
          ),
        );
      }

      return ok(notification);
    } catch (error) {
      return err(
        new NotificationServiceError(
          `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }

  async createSubscribedUserAddedCardNotification(
    recipientUserId: CuratorId,
    actorUserId: CuratorId,
    cardId: CardId,
    collectionIds?: CollectionId[],
  ): Promise<Result<Notification, NotificationServiceError>> {
    try {
      if (recipientUserId.equals(actorUserId)) {
        return err(
          new NotificationServiceError(
            'Cannot notify user about their own action',
          ),
        );
      }

      const notificationResult = Notification.createSubscribedUserAddedCard(
        recipientUserId,
        actorUserId,
        cardId,
        collectionIds,
      );

      if (notificationResult.isErr()) {
        return err(
          new NotificationServiceError(notificationResult.error.message),
        );
      }

      const notification = notificationResult.value;
      const saveResult = await this.notificationRepository.save(notification);

      if (saveResult.isErr()) {
        return err(
          new NotificationServiceError(
            `Failed to save notification: ${saveResult.error.message}`,
          ),
        );
      }

      return ok(notification);
    } catch (error) {
      return err(
        new NotificationServiceError(
          `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }

  async createUserAddedCardToSubscribedCollectionNotification(
    recipientUserId: CuratorId,
    actorUserId: CuratorId,
    cardId: CardId,
    collectionIds?: CollectionId[],
  ): Promise<Result<Notification, NotificationServiceError>> {
    try {
      if (recipientUserId.equals(actorUserId)) {
        return err(
          new NotificationServiceError(
            'Cannot notify user about their own action',
          ),
        );
      }

      const notificationResult =
        Notification.createUserAddedCardToSubscribedCollection(
          recipientUserId,
          actorUserId,
          cardId,
          collectionIds,
        );

      if (notificationResult.isErr()) {
        return err(
          new NotificationServiceError(notificationResult.error.message),
        );
      }

      const notification = notificationResult.value;
      const saveResult = await this.notificationRepository.save(notification);

      if (saveResult.isErr()) {
        return err(
          new NotificationServiceError(
            `Failed to save notification: ${saveResult.error.message}`,
          ),
        );
      }

      return ok(notification);
    } catch (error) {
      return err(
        new NotificationServiceError(
          `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }

  async createUserConnectedYourCollectionNotification(
    recipientUserId: CuratorId,
    actorUserId: CuratorId,
    connectionId: ConnectionId,
  ): Promise<Result<Notification, NotificationServiceError>> {
    try {
      // Don't create notification if user is connecting their own collection
      if (recipientUserId.equals(actorUserId)) {
        return err(
          new NotificationServiceError(
            'Cannot notify user about their own action',
          ),
        );
      }

      const notificationResult = Notification.createUserConnectedYourCollection(
        recipientUserId,
        actorUserId,
        connectionId,
      );

      if (notificationResult.isErr()) {
        return err(
          new NotificationServiceError(notificationResult.error.message),
        );
      }

      const notification = notificationResult.value;
      const saveResult = await this.notificationRepository.save(notification);

      if (saveResult.isErr()) {
        return err(
          new NotificationServiceError(
            `Failed to save notification: ${saveResult.error.message}`,
          ),
        );
      }

      return ok(notification);
    } catch (error) {
      return err(
        new NotificationServiceError(
          `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }

  async createSubscribedUserMadeConnectionNotification(
    recipientUserId: CuratorId,
    actorUserId: CuratorId,
    connectionId: ConnectionId,
  ): Promise<Result<Notification, NotificationServiceError>> {
    try {
      if (recipientUserId.equals(actorUserId)) {
        return err(
          new NotificationServiceError(
            'Cannot notify user about their own action',
          ),
        );
      }
      const notificationResult =
        Notification.createSubscribedUserMadeConnection(
          recipientUserId,
          actorUserId,
          connectionId,
        );
      if (notificationResult.isErr()) {
        return err(
          new NotificationServiceError(notificationResult.error.message),
        );
      }
      const notification = notificationResult.value;
      const saveResult = await this.notificationRepository.save(notification);
      if (saveResult.isErr()) {
        return err(
          new NotificationServiceError(
            `Failed to save notification: ${saveResult.error.message}`,
          ),
        );
      }
      return ok(notification);
    } catch (error) {
      return err(
        new NotificationServiceError(
          `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }

  async createUserAddedSubscribedCollectionNotification(
    recipientUserId: CuratorId,
    actorUserId: CuratorId,
    cardId: CardId,
    collectionIds?: CollectionId[],
  ): Promise<Result<Notification, NotificationServiceError>> {
    try {
      if (recipientUserId.equals(actorUserId)) {
        return err(
          new NotificationServiceError(
            'Cannot notify user about their own action',
          ),
        );
      }
      const notificationResult =
        Notification.createUserAddedSubscribedCollection(
          recipientUserId,
          actorUserId,
          cardId,
          collectionIds,
        );
      if (notificationResult.isErr()) {
        return err(
          new NotificationServiceError(notificationResult.error.message),
        );
      }
      const notification = notificationResult.value;
      const saveResult = await this.notificationRepository.save(notification);
      if (saveResult.isErr()) {
        return err(
          new NotificationServiceError(
            `Failed to save notification: ${saveResult.error.message}`,
          ),
        );
      }
      return ok(notification);
    } catch (error) {
      return err(
        new NotificationServiceError(
          `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }

  /**
   * Bring mention notifications for one item (note card, connection, or
   * collection) in line with the currently mentioned users.
   * - Creates a notification for each newly mentioned Semble user (skipping
   *   the actor and anyone already notified for this item).
   * - Retracts (deletes) unread mention notifications whose recipient is no
   *   longer mentioned. Read notifications are left alone.
   */
  async reconcileMentionNotifications(
    actorUserId: CuratorId,
    source:
      | { mentionSource: 'NOTE'; cardId: CardId }
      | { mentionSource: 'CONNECTION'; connectionId: ConnectionId }
      | { mentionSource: 'COLLECTION'; collectionId: CollectionId },
    recipientUserIds: CuratorId[],
  ): Promise<Result<void, NotificationServiceError>> {
    try {
      const itemKey =
        source.mentionSource === 'NOTE'
          ? { cardId: source.cardId.getStringValue() }
          : source.mentionSource === 'CONNECTION'
            ? { connectionId: source.connectionId.getStringValue() }
            : { collectionId: source.collectionId.getStringValue() };

      const existingResult =
        await this.notificationRepository.findMentionNotificationsByItem(
          itemKey,
        );
      if (existingResult.isErr()) {
        return err(
          new NotificationServiceError(
            `Failed to load existing mention notifications: ${existingResult.error.message}`,
          ),
        );
      }
      const existing = existingResult.value;
      const existingByRecipient = new Map(
        existing.map((n) => [n.recipientUserId.value, n]),
      );
      const wantedRecipients = new Set(
        recipientUserIds
          .filter((id) => !id.equals(actorUserId))
          .map((id) => id.value),
      );

      // Create notifications for newly mentioned users
      for (const recipientDid of wantedRecipients) {
        if (existingByRecipient.has(recipientDid)) continue;
        const recipientIdResult = CuratorId.create(recipientDid);
        if (recipientIdResult.isErr()) continue;

        const notificationResult = Notification.createMention(
          recipientIdResult.value,
          actorUserId,
          source,
        );
        if (notificationResult.isErr()) {
          return err(
            new NotificationServiceError(notificationResult.error.message),
          );
        }
        const saveResult = await this.notificationRepository.save(
          notificationResult.value,
        );
        if (saveResult.isErr()) {
          return err(
            new NotificationServiceError(
              `Failed to save mention notification: ${saveResult.error.message}`,
            ),
          );
        }
      }

      // Retract unread notifications for users no longer mentioned
      for (const notification of existing) {
        if (wantedRecipients.has(notification.recipientUserId.value)) continue;
        if (notification.read) continue;
        const deleteResult = await this.notificationRepository.delete(
          notification.notificationId,
        );
        if (deleteResult.isErr()) {
          return err(
            new NotificationServiceError(
              `Failed to retract mention notification: ${deleteResult.error.message}`,
            ),
          );
        }
      }

      return ok(undefined);
    } catch (error) {
      return err(
        new NotificationServiceError(
          `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }

  async createUserConnectedSubscribedCollectionNotification(
    recipientUserId: CuratorId,
    actorUserId: CuratorId,
    connectionId: ConnectionId,
  ): Promise<Result<Notification, NotificationServiceError>> {
    try {
      if (recipientUserId.equals(actorUserId)) {
        return err(
          new NotificationServiceError(
            'Cannot notify user about their own action',
          ),
        );
      }
      const notificationResult =
        Notification.createUserConnectedSubscribedCollection(
          recipientUserId,
          actorUserId,
          connectionId,
        );
      if (notificationResult.isErr()) {
        return err(
          new NotificationServiceError(notificationResult.error.message),
        );
      }
      const notification = notificationResult.value;
      const saveResult = await this.notificationRepository.save(notification);
      if (saveResult.isErr()) {
        return err(
          new NotificationServiceError(
            `Failed to save notification: ${saveResult.error.message}`,
          ),
        );
      }
      return ok(notification);
    } catch (error) {
      return err(
        new NotificationServiceError(
          `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }
}
