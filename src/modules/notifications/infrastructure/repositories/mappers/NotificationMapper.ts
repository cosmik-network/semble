import { Notification, NotificationMetadata } from '../../../domain/Notification';
import { NotificationId } from '../../../domain/value-objects/NotificationId';
import { NotificationType, NotificationTypeEnum } from '../../../domain/value-objects/NotificationType';
import { CuratorId } from '../../../../cards/domain/value-objects/CuratorId';
import { Result, ok, err } from '../../../../../shared/core/Result';
import { UniqueEntityID } from '../../../../../shared/domain/UniqueEntityID';

export interface NotificationDTO {
  id: string;
  recipientUserId: string;
  actorUserId: string;
  type: string;
  metadata: NotificationMetadata;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class NotificationMapper {
  public static toDomain(dto: NotificationDTO): Result<Notification> {
    try {
      const recipientUserIdResult = CuratorId.create(dto.recipientUserId);
      if (recipientUserIdResult.isErr()) {
        return err(recipientUserIdResult.error);
      }

      const actorUserIdResult = CuratorId.create(dto.actorUserId);
      if (actorUserIdResult.isErr()) {
        return err(actorUserIdResult.error);
      }

      const typeResult = NotificationType.create(dto.type as NotificationTypeEnum);
      if (typeResult.isErr()) {
        return err(typeResult.error);
      }

      const notificationResult = Notification.create(
        {
          recipientUserId: recipientUserIdResult.value,
          actorUserId: actorUserIdResult.value,
          type: typeResult.value,
          metadata: dto.metadata,
          read: dto.read,
          createdAt: dto.createdAt,
          updatedAt: dto.updatedAt,
        },
        new UniqueEntityID(dto.id),
      );

      if (notificationResult.isErr()) {
        return err(notificationResult.error);
      }

      return ok(notificationResult.value);
    } catch (error) {
      return err(error as Error);
    }
  }

  public static toPersistence(notification: Notification): NotificationDTO {
    return {
      id: notification.notificationId.getStringValue(),
      recipientUserId: notification.recipientUserId.value,
      actorUserId: notification.actorUserId.value,
      type: notification.type.value,
      metadata: notification.metadata,
      read: notification.read,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
    };
  }
}
