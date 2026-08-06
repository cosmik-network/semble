import { UseCase } from 'src/shared/core/UseCase';
import { Result, err, ok } from 'src/shared/core/Result';
import { AppError } from 'src/shared/core/AppError';
import {
  IUserOnboardingRepository,
  OnboardingStateRecord,
} from '../../domain/repositories/IUserOnboardingRepository';

export interface GetOnboardingStateDTO {
  userId: string;
}

export type GetOnboardingStateResult = Result<
  OnboardingStateRecord,
  AppError.UnexpectedError
>;

function emptyState(userId: string): OnboardingStateRecord {
  return {
    userId,
    onboardingCompleted: null,
    topicsSelected: null,
    linksSuggested: null,
    linksSelected: null,
    suggestedAccounts: null,
    suggestedCollections: null,
    followedAccounts: null,
    followedCollections: null,
    firstCards: null,
    firstCollection: null,
    firstConnection: null,
    pwaInstalled: null,
    iosShortcutInstalled: null,
    browserExtensionInstalled: null,
    saveModalGuideCompleted: null,
    connectionCreationModalCompleted: null,
    semblePageNavigationCompleted: null,
    intention: null,
    referralSource: null,
    updatedAt: new Date(),
  };
}

export class GetOnboardingStateUseCase implements UseCase<
  GetOnboardingStateDTO,
  Promise<GetOnboardingStateResult>
> {
  constructor(private onboardingRepository: IUserOnboardingRepository) {}

  async execute(
    request: GetOnboardingStateDTO,
  ): Promise<GetOnboardingStateResult> {
    const result = await this.onboardingRepository.findByUserId(request.userId);
    if (result.isErr()) {
      return err(new AppError.UnexpectedError(result.error));
    }

    // No row yet: return a usable, empty state so the client always gets an object.
    return ok(result.value ?? emptyState(request.userId));
  }
}
