import { Result, ok, err } from '../../../../shared/core/Result';
import { UseCase } from '../../../../shared/core/UseCase';
import { UseCaseError } from '../../../../shared/core/UseCaseError';
import { AppError } from '../../../../shared/core/AppError';
import { ISyncStatusRepository } from '../../domain/repositories/ISyncStatusRepository';
import { DID } from '../../../user/domain/value-objects/DID';
import { SyncStatus } from '../../domain/SyncStatus';
import { ATPROTO_NSID } from '../../../../shared/constants/atproto';
import { IAtProtoRepoService } from '../../../atproto/application/IAtProtoRepoService';
import { ProcessMarginBookmarkFirehoseEventUseCase } from '../../../atproto/application/useCases/ProcessMarginBookmarkFirehoseEventUseCase';
import { ProcessMarginCollectionFirehoseEventUseCase } from '../../../atproto/application/useCases/ProcessMarginCollectionFirehoseEventUseCase';
import { ProcessMarginCollectionItemFirehoseEventUseCase } from '../../../atproto/application/useCases/ProcessMarginCollectionItemFirehoseEventUseCase';
import {
  Environment,
  EnvironmentConfigService,
} from 'src/shared/infrastructure/config/EnvironmentConfigService';
import { IAtUriResolutionService } from '../../../cards/domain/services/IAtUriResolutionService';

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
  constructor(
    private syncStatusRepo: ISyncStatusRepository,
    private atProtoRepoService: IAtProtoRepoService,
    private atUriResolutionService: IAtUriResolutionService,
    private processMarginBookmarkUseCase: ProcessMarginBookmarkFirehoseEventUseCase,
    private processMarginCollectionUseCase: ProcessMarginCollectionFirehoseEventUseCase,
    private processMarginCollectionItemUseCase: ProcessMarginCollectionItemFirehoseEventUseCase,
  ) {}

  async execute(
    request: SyncAccountDataDTO,
  ): Promise<Result<void, ValidationError | AppError.UnexpectedError>> {
    let syncStatus: SyncStatus | undefined;

    try {
      const envConfig = new EnvironmentConfigService();

      // skip syncs in prod env for now
      if (envConfig.get().environment === Environment.PROD) {
        return ok(undefined);
      }

      console.log(
        `[SYNC] SyncAccountDataUseCase triggered for curator: ${request.curatorId}, card: ${request.cardId}`,
      );

      // Create DID value object
      const didResult = DID.create(request.curatorId);
      if (didResult.isErr()) {
        return err(new ValidationError(didResult.error.message));
      }
      const curatorId = didResult.value;

      // Check if user has already been synced or is currently syncing
      // Use SELECT FOR UPDATE to prevent concurrent sync attempts
      const syncStatusResult =
        await this.syncStatusRepo.findAndLockByCuratorId(curatorId);
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

      // Defense in depth: check if another process is already syncing
      if (existingSyncStatus && existingSyncStatus.syncState.isInProgress()) {
        console.log(
          `[SYNC] User ${request.curatorId} sync is already in progress, skipping`,
        );
        return ok(undefined);
      }

      // only listen for test account in local env
      if (
        envConfig.get().environment === Environment.LOCAL &&
        curatorId.toString() !== process.env.BSKY_DID
      ) {
        return ok(undefined);
      }

      if (existingSyncStatus) {
        // Create or update sync status to mark in progress
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

      // Perform the sync
      const recordsProcessed = await this.performSync(request.curatorId);

      // Mark sync as completed
      syncStatus.markSyncCompleted(recordsProcessed);
      await this.syncStatusRepo.save(syncStatus);

      console.log(
        `[SYNC] Successfully completed sync for ${request.curatorId}: ${recordsProcessed} records processed`,
      );

      return ok(undefined);
    } catch (error) {
      // Mark sync as failed if we have a syncStatus object
      if (syncStatus) {
        syncStatus.markSyncFailed(
          error instanceof Error ? error.message : String(error),
        );
        await this.syncStatusRepo.save(syncStatus);
      }

      console.error('[SYNC] Error in SyncAccountDataUseCase:', error);
      return err(AppError.UnexpectedError.create(error));
    }
  }

  /**
   * Perform the actual sync process for a user
   */
  private async performSync(curatorId: string): Promise<number> {
    console.log(`[SYNC] Starting sync for curator: ${curatorId}`);

    let totalProcessed = 0;

    // 1. Sync bookmarks first (creates URL cards)
    console.log(`[SYNC] Syncing bookmarks for ${curatorId}...`);
    const bookmarksProcessed = await this.syncCollection(
      curatorId,
      ATPROTO_NSID.MARGIN.BOOKMARK,
      this.processMarginBookmarkUseCase,
    );
    totalProcessed += bookmarksProcessed;
    console.log(`[SYNC] Processed ${bookmarksProcessed} bookmarks`);

    // 2. Sync collections (creates collection entities)
    console.log(`[SYNC] Syncing collections for ${curatorId}...`);
    const collectionsProcessed = await this.syncCollection(
      curatorId,
      ATPROTO_NSID.MARGIN.COLLECTION,
      this.processMarginCollectionUseCase,
    );
    totalProcessed += collectionsProcessed;
    console.log(`[SYNC] Processed ${collectionsProcessed} collections`);

    // 3. Sync collection items (links cards to collections)
    console.log(`[SYNC] Syncing collection items for ${curatorId}...`);
    const itemsProcessed = await this.syncCollection(
      curatorId,
      ATPROTO_NSID.MARGIN.COLLECTION_ITEM,
      this.processMarginCollectionItemUseCase,
    );
    totalProcessed += itemsProcessed;
    console.log(`[SYNC] Processed ${itemsProcessed} collection items`);

    return totalProcessed;
  }

  /**
   * Sync a specific collection type with batched concurrent processing
   */
  private async syncCollection(
    curatorId: string,
    collectionType: string,
    useCase:
      | ProcessMarginBookmarkFirehoseEventUseCase
      | ProcessMarginCollectionFirehoseEventUseCase
      | ProcessMarginCollectionItemFirehoseEventUseCase,
  ): Promise<number> {
    let totalProcessed = 0;
    let pageCount = 0;
    const CONCURRENT_BATCH_SIZE = 10; // Process 10 records at a time

    // Use the async generator to fetch all records with automatic pagination
    for await (const recordsResult of this.atProtoRepoService.listAllRecords(
      curatorId,
      collectionType,
      100, // Fetch 100 records per page
    )) {
      // Handle error from service
      if (recordsResult.isErr()) {
        console.error(
          `[SYNC] Error fetching ${collectionType} records: ${recordsResult.error.message}`,
        );
        break;
      }

      const records = recordsResult.value;
      pageCount++;

      console.log(
        `[SYNC] Retrieved ${records.length} records from ${collectionType} (page ${pageCount})`,
      );

      // Process in batches of CONCURRENT_BATCH_SIZE
      for (let i = 0; i < records.length; i += CONCURRENT_BATCH_SIZE) {
        const batch = records.slice(i, i + CONCURRENT_BATCH_SIZE);
        const batchNumber = Math.floor(i / CONCURRENT_BATCH_SIZE) + 1;

        console.log(
          `[SYNC] Processing batch ${batchNumber} (${batch.length} records) from page ${pageCount}...`,
        );

        // Process all records in this batch concurrently
        const results = await Promise.allSettled(
          batch.map((record) =>
            this.processRecord(record, useCase, curatorId, collectionType),
          ),
        );

        // Count successful processes
        const successCount = results.filter(
          (result) => result.status === 'fulfilled' && result.value === true,
        ).length;

        totalProcessed += successCount;

        console.log(
          `[SYNC] Batch ${batchNumber}: processed ${successCount}/${batch.length} records`,
        );
      }
    }

    return totalProcessed;
  }

  /**
   * Process a single record from the AT Protocol repository
   */
  private async processRecord(
    record: { uri: string; cid: string; value: any },
    useCase:
      | ProcessMarginBookmarkFirehoseEventUseCase
      | ProcessMarginCollectionFirehoseEventUseCase
      | ProcessMarginCollectionItemFirehoseEventUseCase,
    curatorId: string,
    collectionType: string,
  ): Promise<boolean> {
    try {
      // First, check if this AT URI already exists in our system
      const resolutionResult = await this.atUriResolutionService.resolveAtUri(
        record.uri,
      );

      if (resolutionResult.isErr()) {
        console.warn(
          `[SYNC] Error resolving AT URI ${record.uri}: ${resolutionResult.error.message}`,
        );
        // Continue processing despite resolution error
      } else if (resolutionResult.value !== null) {
        // Resource already exists, skip processing
        console.log(
          `[SYNC] Skipping ${collectionType} record ${record.uri} - already exists (type: ${resolutionResult.value.type})`,
        );
        return true; // Count as successful (already processed)
      }

      // Build DTO matching firehose event structure
      const dto = {
        atUri: record.uri,
        cid: record.cid,
        eventType: 'create' as const,
        record: record.value,
      };

      console.log(`[SYNC] Processing ${collectionType} record: ${record.uri}`);

      const result = await useCase.execute(dto);

      if (result.isErr()) {
        console.warn(
          `[SYNC] Failed to process record ${record.uri}: ${result.error.message}`,
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error(`[SYNC] Error processing record ${record.uri}:`, error);
      return false;
    }
  }
}
