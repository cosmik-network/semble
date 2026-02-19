import { Result, ok, err } from '../../../../shared/core/Result';
import { DomainService } from '../../../../shared/domain/DomainService';
import { Notification } from '../Notification';
import { INotificationRepository } from '../INotificationRepository';
import { CuratorId } from '../../../cards/domain/value-objects/CuratorId';
import { CardId } from '../../../cards/domain/value-objects/CardId';
import { CollectionId } from '../../../cards/domain/value-objects/CollectionId';

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
}
