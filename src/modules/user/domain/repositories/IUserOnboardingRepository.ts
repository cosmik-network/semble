import { Result } from 'src/shared/core/Result';

export type OnboardingStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'SKIPPED';

export interface OnboardingStateRecord {
  userId: string;
  onboardingState: OnboardingStatus | null;
  topicsSelected: string[] | null;
  linksSuggested: string[] | null;
  linksSelected: string[] | null;
  suggestedAccounts: string[] | null;
  suggestedCollections: string[] | null;
  followedAccounts: string[] | null;
  followedCollections: string[] | null;
  firstCards: string[] | null;
  firstCollection: string | null;
  firstConnection: string | null;
  pwaClicked: Date | null;
  iosShortcutClicked: Date | null;
  browserExtensionClicked: Date | null;
  mcpClicked: Date | null;
  saveModalGuideCompleted: Date | null;
  connectionCreationModalCompleted: Date | null;
  semblePageNavigationCompleted: Date | null;
  intention: string[] | null;
  referralSource: string[] | null;
  updatedAt: Date;
}

export type OnboardingStateUpdate = Partial<
  Omit<OnboardingStateRecord, 'userId' | 'updatedAt'>
>;

export interface IUserOnboardingRepository {
  findByUserId(userId: string): Promise<Result<OnboardingStateRecord | null>>;
  // Writes only the provided columns, and returns the full merged record.
  upsert(
    userId: string,
    update: OnboardingStateUpdate,
  ): Promise<Result<OnboardingStateRecord>>;
}
