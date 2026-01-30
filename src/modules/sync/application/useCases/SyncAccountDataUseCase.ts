import { Result, ok, err } from '../../../../shared/core/Result';
import { UseCase } from '../../../../shared/core/UseCase';
import { UseCaseError } from '../../../../shared/core/UseCaseError';
import { AppError } from '../../../../shared/core/AppError';
import { ISyncStatusRepository } from '../../domain/repositories/ISyncStatusRepository';
import { DID } from '../../../user/domain/value-objects/DID';
import { SyncStatus } from '../../domain/SyncStatus';

export interface SyncAccountDataDTO {
  curatorId: string;
  cardId: string;
}

export class ValidationError extends UseCaseError {
  constructor(message: string) {
    super(message);
  }
}

export class SyncAccountDataUseCase
  implements
    UseCase<
      SyncAccountDataDTO,
      Result<void, ValidationError | AppError.UnexpectedError>
    >
{
  constructor(private syncStatusRepo: ISyncStatusRepository) {}

  async execute(
    request: SyncAccountDataDTO,
  ): Promise<Result<void, ValidationError | AppError.UnexpectedError>> {
    try {
      console.log(
        `[SYNC] SyncAccountDataUseCase triggered for curator: ${request.curatorId}, card: ${request.cardId}`,
      );

      // Create DID value object
      const didResult = DID.create(request.curatorId);
      if (didResult.isErr()) {
        return err(new ValidationError(didResult.error.message));
      }
      const curatorId = didResult.value;

      // Check if user has already been synced
      const syncStatusResult =
        await this.syncStatusRepo.findByCuratorId(curatorId);
      if (syncStatusResult.isErr()) {
        console.error(
          '[SYNC] Error fetching sync status:',
          syncStatusResult.error,
        );
        return err(AppError.UnexpectedError.create(syncStatusResult.error));
      }

      const existingSyncStatus = syncStatusResult.value;

      if (existingSyncStatus && existingSyncStatus.syncState.isCompleted()) {
        console.log(
          `[SYNC] User ${request.curatorId} has already been synced, skipping`,
        );
        return ok(undefined);
      }

      // Create or update sync status to mark in progress
      let syncStatus: SyncStatus;
      if (existingSyncStatus) {
        syncStatus = existingSyncStatus;
        syncStatus.markSyncInProgress();
      } else {
        const newSyncStatusResult = SyncStatus.createNew(curatorId);
        if (newSyncStatusResult.isErr()) {
          return err(
            AppError.UnexpectedError.create(newSyncStatusResult.error),
          );
        }
        syncStatus = newSyncStatusResult.value;
        syncStatus.markSyncInProgress();
      }

      // Save sync status
      const saveResult = await this.syncStatusRepo.save(syncStatus);
      if (saveResult.isErr()) {
        console.error('[SYNC] Error saving sync status:', saveResult.error);
        return err(AppError.UnexpectedError.create(saveResult.error));
      }

      console.log(
        `[SYNC] Starting sync process for user ${request.curatorId}...`,
      );

      // TODO: Trigger the actual sync process
      // This would involve:
      // 1. Getting an authenticated agent for the user
      // 2. Fetching records from their ATProto repository
      // 3. Transforming records into cards/collections
      // 4. Saving them to the database
      const recordsProcessed = await this.performSync(request.curatorId);

      // Mark sync as completed
      syncStatus.markSyncCompleted(recordsProcessed);
      const finalSaveResult = await this.syncStatusRepo.save(syncStatus);
      if (finalSaveResult.isErr()) {
        console.error(
          '[SYNC] Error saving final sync status:',
          finalSaveResult.error,
        );
        // Don't fail the whole operation if we can't save the status
      }

      console.log(
        `[SYNC] Sync process completed for user ${request.curatorId}`,
      );

      return ok(undefined);
    } catch (error) {
      console.error('[SYNC] Error in SyncAccountDataUseCase:', error);
      return err(AppError.UnexpectedError.create(error));
    }
  }

  /**
   * Perform the actual sync process for a user
   * TODO: Implement actual sync logic
   */
  private async performSync(curatorId: string): Promise<number> {
    // Stub implementation
    console.log(`[SYNC] Performing sync for user ${curatorId} (stub)`);

    // Future implementation would:
    // 1. Get authenticated agent
    // 2. Call agent.com.atproto.repo.listRecords for each collection type
    // 3. Transform and save records
    // 4. Return count of records processed

    // Simulate async operation
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Return stub count
    return 0;
  }
}
