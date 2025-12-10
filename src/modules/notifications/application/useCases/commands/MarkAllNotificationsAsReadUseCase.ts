import { Result, ok, err } from '../../../../../shared/core/Result';
import { UseCase } from '../../../../../shared/core/UseCase';
import { UseCaseError } from '../../../../../shared/core/UseCaseError';
import { AppError } from '../../../../../shared/core/AppError';
import { INotificationRepository } from '../../../domain/INotificationRepository';
import { CuratorId } from '../../../../cards/domain/value-objects/CuratorId';

export interface MarkAllNotificationsAsReadDTO {
  userId: string;
}

export interface MarkAllNotificationsAsReadResponseDTO {
  markedCount: number;
}

export class ValidationError extends UseCaseError {
  constructor(message: string) {
    super(message);
  }
}

export class MarkAllNotificationsAsReadUseCase
  implements
    UseCase<
      MarkAllNotificationsAsReadDTO,
      Result<
        MarkAllNotificationsAsReadResponseDTO,
        ValidationError | AppError.UnexpectedError
      >
    >
{
  constructor(private notificationRepository: INotificationRepository) {}

  async execute(
    request: MarkAllNotificationsAsReadDTO,
  ): Promise<
    Result<
      MarkAllNotificationsAsReadResponseDTO,
      ValidationError | AppError.UnexpectedError
    >
  > {
    try {
      const userIdResult = CuratorId.create(request.userId);
      if (userIdResult.isErr()) {
        return err(
          new ValidationError(`Invalid user ID: ${userIdResult.error.message}`),
        );
      }

      const result = await this.notificationRepository.markAllAsReadForUser(
        userIdResult.value,
      );

      if (result.isErr()) {
        return err(new ValidationError(result.error.message));
      }

      return ok({
        markedCount: result.value,
      });
    } catch (error) {
      return err(AppError.UnexpectedError.create(error));
    }
  }
}
