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
}
