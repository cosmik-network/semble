import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import { err, ok, Result } from 'src/shared/core/Result';
import {
  IUserOnboardingRepository,
  OnboardingStateRecord,
  OnboardingStateUpdate,
} from '../../domain/repositories/IUserOnboardingRepository';
import { onboardingState } from './schema/onboardingState.sql';

type OnboardingRow = typeof onboardingState.$inferSelect;

function toRecord(row: OnboardingRow): OnboardingStateRecord {
  return {
    userId: row.userId,
    onboardingState: row.onboardingState,
    topicsSelected: row.topicsSelected,
    linksSuggested: row.linksSuggested,
    linksSelected: row.linksSelected,
    suggestedAccounts: row.suggestedAccounts,
    suggestedCollections: row.suggestedCollections,
    followedAccounts: row.followedAccounts,
    followedCollections: row.followedCollections,
    firstCards: row.firstCards,
    firstCollection: row.firstCollection,
    firstConnection: row.firstConnection,
    pwaClicked: row.pwaClicked,
    iosShortcutClicked: row.iosShortcutClicked,
    browserExtensionClicked: row.browserExtensionClicked,
    mcpClicked: row.mcpClicked,
    saveModalGuideCompleted: row.saveModalGuideCompleted,
    connectionCreationModalCompleted: row.connectionCreationModalCompleted,
    semblePageNavigationCompleted: row.semblePageNavigationCompleted,
    intention: row.intention,
    referralSource: row.referralSource,
    updatedAt: row.updatedAt,
  };
}

export class DrizzleUserOnboardingRepository implements IUserOnboardingRepository {
  constructor(private db: PostgresJsDatabase) {}

  async findByUserId(
    userId: string,
  ): Promise<Result<OnboardingStateRecord | null>> {
    try {
      const result = await this.db
        .select()
        .from(onboardingState)
        .where(eq(onboardingState.userId, userId))
        .limit(1);

      const row = result[0];
      if (!row) {
        return ok(null);
      }

      return ok(toRecord(row));
    } catch (error: any) {
      return err(error);
    }
  }

  async upsert(
    userId: string,
    update: OnboardingStateUpdate,
  ): Promise<Result<OnboardingStateRecord>> {
    try {
      // Only the keys present in `update` are written, so untouched columns are
      // preserved on conflict (PATCH semantics).
      const result = await this.db
        .insert(onboardingState)
        .values({ userId, ...update })
        .onConflictDoUpdate({
          target: onboardingState.userId,
          set: { ...update, updatedAt: new Date() },
        })
        .returning();

      const row = result[0];
      if (!row) {
        return err(new Error('Failed to upsert onboarding state'));
      }

      return ok(toRecord(row));
    } catch (error: any) {
      return err(error);
    }
  }
}
