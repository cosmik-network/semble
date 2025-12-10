import { Result, ok, err } from '../../../../../shared/core/Result';
import { UseCase } from '../../../../../shared/core/UseCase';
import { UseCaseError } from '../../../../../shared/core/UseCaseError';
import { AppError } from '../../../../../shared/core/AppError';
import { CuratorId } from '../../../../cards/domain/value-objects/CuratorId';
import { CardId } from '../../../../cards/domain/value-objects/CardId';
import { CollectionId } from '../../../../cards/domain/value-objects/CollectionId';
import { NotificationService } from '../../../domain/services/NotificationService';
import { NotificationType } from '@semble/types';

export interface CreateUserAddedYourCardNotificationDTO {
  type: NotificationType.USER_ADDED_YOUR_CARD;
  recipientUserId: string;
  actorUserId: string;
  cardId: string;
  collectionIds?: string[];
}

export type CreateNotificationDTO = CreateUserAddedYourCardNotificationDTO;

export interface CreateNotificationResponseDTO {
  notificationId: string;
}

export class ValidationError extends UseCaseError {
  constructor(message: string) {
    super(message);
  }
}

export class CreateNotificationUseCase
  implements
    UseCase<
      CreateNotificationDTO,
      Result<
        CreateNotificationResponseDTO,
        ValidationError | AppError.UnexpectedError
      >
    >
{
  constructor(private notificationService: NotificationService) {}

  async execute(
    request: CreateNotificationDTO,
  ): Promise<
    Result<
      CreateNotificationResponseDTO,
      ValidationError | AppError.UnexpectedError
    >
  > {
    try {
      // Validate and create recipient CuratorId
      const recipientIdResult = CuratorId.create(request.recipientUserId);
      if (recipientIdResult.isErr()) {
        return err(
          new ValidationError(
            `Invalid recipient ID: ${recipientIdResult.error.message}`,
          ),
        );
      }
      const recipientId = recipientIdResult.value;

      // Validate and create actor CuratorId
      const actorIdResult = CuratorId.create(request.actorUserId);
      if (actorIdResult.isErr()) {
        return err(
          new ValidationError(
            `Invalid actor ID: ${actorIdResult.error.message}`,
          ),
        );
      }
      const actorId = actorIdResult.value;

      // Validate and create CardId
      const cardIdResult = CardId.createFromString(request.cardId);
      if (cardIdResult.isErr()) {
        return err(
          new ValidationError(`Invalid card ID: ${cardIdResult.error.message}`),
        );
      }
      const cardId = cardIdResult.value;

      // Validate collection IDs if provided
      let collectionIds: CollectionId[] | undefined;
      if (request.collectionIds && request.collectionIds.length > 0) {
        collectionIds = [];
        for (const collectionIdStr of request.collectionIds) {
          const collectionIdResult =
            CollectionId.createFromString(collectionIdStr);
          if (collectionIdResult.isErr()) {
            return err(
              new ValidationError(
                `Invalid collection ID: ${collectionIdResult.error.message}`,
              ),
            );
          }
          collectionIds.push(collectionIdResult.value);
        }
      }

      const notificationResult =
        await this.notificationService.createUserAddedYourCardNotification(
          recipientId,
          actorId,
          cardId,
          collectionIds,
        );

      if (notificationResult.isErr()) {
        return err(new ValidationError(notificationResult.error.message));
      }

      return ok({
        notificationId:
          notificationResult.value.notificationId.getStringValue(),
      });
    } catch (error) {
      return err(AppError.UnexpectedError.create(error));
    }
  }
}
