import { UseCase } from 'src/shared/core/UseCase';
import { Result, err, ok } from 'src/shared/core/Result';
import { AppError } from 'src/shared/core/AppError';
import {
  IUserOnboardingRepository,
  OnboardingStateRecord,
  OnboardingStateUpdate,
} from '../../domain/repositories/IUserOnboardingRepository';

export interface UpdateOnboardingStateDTO {
  userId: string;
  update: OnboardingStateUpdate;
}

export type UpdateOnboardingStateResult = Result<
  OnboardingStateRecord,
  AppError.UnexpectedError
>;

export class UpdateOnboardingStateUseCase implements UseCase<
  UpdateOnboardingStateDTO,
  Promise<UpdateOnboardingStateResult>
> {
  constructor(private onboardingRepository: IUserOnboardingRepository) {}

  async execute(
    request: UpdateOnboardingStateDTO,
  ): Promise<UpdateOnboardingStateResult> {
    const result = await this.onboardingRepository.upsert(
      request.userId,
      request.update,
    );
    if (result.isErr()) {
      return err(new AppError.UnexpectedError(result.error));
    }

    return ok(result.value);
  }
}
