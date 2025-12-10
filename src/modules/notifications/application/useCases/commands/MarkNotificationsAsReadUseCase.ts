import { Result, ok, err } from '../../../../../shared/core/Result';
import { UseCase } from '../../../../../shared/core/UseCase';
import { UseCaseError } from '../../../../../shared/core/UseCaseError';
import { AppError } from '../../../../../shared/core/AppError';
import { INotificationRepository } from '../../../domain/INotificationRepository';
import { NotificationId } from '../../../domain/value-objects/NotificationId';

export interface MarkNotificationsAsReadDTO {
  notificationIds: string[];
}

export interface MarkNotificationsAsReadResponseDTO {
  markedCount: number;
}

export class ValidationError extends UseCaseError {
  constructor(message: string) {
    super(message);
  }
}

export class MarkNotificationsAsReadUseCase
  implements
    UseCase<
      MarkNotificationsAsReadDTO,
      Result<
        MarkNotificationsAsReadResponseDTO,
        ValidationError | AppError.UnexpectedError
      >
    >
{
  constructor(private notificationRepository: INotificationRepository) {}

  async execute(
    request: MarkNotificationsAsReadDTO,
  ): Promise<
    Result<
      MarkNotificationsAsReadResponseDTO,
      ValidationError | AppError.UnexpectedError
    >
  > {
    try {
      if (!request.notificationIds || request.notificationIds.length === 0) {
        return err(new ValidationError('At least one notification ID is required'));
      }

      const notificationIds: NotificationId[] = [];
      for (const idStr of request.notificationIds) {
        const idResult = NotificationId.createFromString(idStr);
        if (idResult.isErr()) {
          return err(new ValidationError(`Invalid notification ID: ${idResult.error.message}`));
        }
        notificationIds.push(idResult.value);
      }

      const result = await this.notificationRepository.markAsRead(notificationIds);

      if (result.isErr()) {
        return err(new ValidationError(result.error.message));
      }

      return ok({
        markedCount: notificationIds.length,
      });
    } catch (error) {
      return err(AppError.UnexpectedError.create(error));
    }
  }
}
