import { Result, ok, err } from 'src/shared/core/Result';
import {
  IUserOnboardingRepository,
  OnboardingStateRecord,
  OnboardingStateUpdate,
} from '../../domain/repositories/IUserOnboardingRepository';

function emptyRecord(userId: string): OnboardingStateRecord {
  return {
    userId,
    onboardingState: null,
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
    pwaClicked: null,
    iosShortcutClicked: null,
    browserExtensionClicked: null,
    mcpClicked: null,
    saveModalGuideCompleted: null,
    connectionCreationModalCompleted: null,
    semblePageNavigationCompleted: null,
    intention: null,
    referralSource: null,
    updatedAt: new Date(),
  };
}

export class InMemoryUserOnboardingRepository implements IUserOnboardingRepository {
  private static instance: InMemoryUserOnboardingRepository;
  private states: Map<string, OnboardingStateRecord> = new Map();

  private constructor() {}

  public static getInstance(): InMemoryUserOnboardingRepository {
    if (!InMemoryUserOnboardingRepository.instance) {
      InMemoryUserOnboardingRepository.instance =
        new InMemoryUserOnboardingRepository();
    }
    return InMemoryUserOnboardingRepository.instance;
  }

  async findByUserId(
    userId: string,
  ): Promise<Result<OnboardingStateRecord | null>> {
    try {
      return ok(this.states.get(userId) ?? null);
    } catch (error: any) {
      return err(error);
    }
  }

  async upsert(
    userId: string,
    update: OnboardingStateUpdate,
  ): Promise<Result<OnboardingStateRecord>> {
    try {
      const existing = this.states.get(userId) ?? emptyRecord(userId);
      // Merge only the provided keys onto the existing record.
      const merged: OnboardingStateRecord = {
        ...existing,
        ...update,
        userId,
        updatedAt: new Date(),
      };
      this.states.set(userId, merged);
      return ok(merged);
    } catch (error: any) {
      return err(error);
    }
  }

  // Helper method for testing
  clear(): void {
    this.states.clear();
  }
}
