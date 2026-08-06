import { Result } from 'src/shared/core/Result';

export interface OnboardingStateRecord {
  userId: string;
  onboardingCompleted: boolean | null;
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
  pwaInstalled: Date | null;
  iosShortcutInstalled: Date | null;
  browserExtensionInstalled: Date | null;
  saveModalGuideCompleted: Date | null;
  connectionCreationModalCompleted: Date | null;
  semblePageNavigationCompleted: Date | null;
  intention: string[] | null;
  referralSource: string[] | null;
  updatedAt: Date;
}

// Only the fields the client provided. userId and updatedAt are managed by the
// server, so they are not part of a partial update.
export type OnboardingStateUpdate = Partial<
  Omit<OnboardingStateRecord, 'userId' | 'updatedAt'>
>;

export interface IUserOnboardingRepository {
  findByUserId(userId: string): Promise<Result<OnboardingStateRecord | null>>;
  // Creates the row if absent, otherwise writes only the provided columns.
  // Returns the full merged record.
  upsert(
    userId: string,
    update: OnboardingStateUpdate,
  ): Promise<Result<OnboardingStateRecord>>;
}
