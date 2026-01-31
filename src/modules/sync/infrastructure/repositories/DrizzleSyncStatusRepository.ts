import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import { ISyncStatusRepository } from '../../domain/repositories/ISyncStatusRepository';
import { SyncStatus } from '../../domain/SyncStatus';
import { DID } from 'src/modules/user/domain/value-objects/DID';
import { SyncState } from '../../domain/value-objects/SyncState';
import { syncStatuses } from './schema/syncStatus.sql';
import { UniqueEntityID } from 'src/shared/domain/UniqueEntityID';
import { err, ok, Result } from 'src/shared/core/Result';

export class DrizzleSyncStatusRepository implements ISyncStatusRepository {
  constructor(private db: PostgresJsDatabase) {}

  async findByCuratorId(curatorId: DID): Promise<Result<SyncStatus | null>> {
    try {
      const result = await this.db
        .select()
        .from(syncStatuses)
        .where(eq(syncStatuses.curatorId, curatorId.value))
        .limit(1);

      if (result.length === 0) {
        return ok(null);
      }

      const data = result[0];

      if (!data) {
        return ok(null);
      }

      // Create sync state value object
      const syncStateResult = SyncState.create(data.syncState);
      if (syncStateResult.isErr()) {
        return err(syncStateResult.error);
      }

      // Create sync status entity
      const syncStatusResult = SyncStatus.create(
        {
          curatorId,
          syncState: syncStateResult.value,
          lastSyncedAt: data.lastSyncedAt ?? undefined,
          lastSyncAttemptAt: data.lastSyncAttemptAt ?? undefined,
          syncErrorMessage: data.syncErrorMessage ?? undefined,
          recordsProcessed: data.recordsProcessed ?? undefined,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        },
        new UniqueEntityID(data.id),
      );

      if (syncStatusResult.isErr()) {
        return err(syncStatusResult.error);
      }

      return ok(syncStatusResult.value);
    } catch (error: any) {
      return err(error);
    }
  }

  async findAndLockByCuratorId(
    curatorId: DID,
  ): Promise<Result<SyncStatus | null>> {
    try {
      const result = await this.db
        .select()
        .from(syncStatuses)
        .where(eq(syncStatuses.curatorId, curatorId.value))
        .for('update')
        .limit(1);

      if (result.length === 0) {
        return ok(null);
      }

      const data = result[0];

      if (!data) {
        return ok(null);
      }

      // Create sync state value object
      const syncStateResult = SyncState.create(data.syncState);
      if (syncStateResult.isErr()) {
        return err(syncStateResult.error);
      }

      // Create sync status entity
      const syncStatusResult = SyncStatus.create(
        {
          curatorId,
          syncState: syncStateResult.value,
          lastSyncedAt: data.lastSyncedAt ?? undefined,
          lastSyncAttemptAt: data.lastSyncAttemptAt ?? undefined,
          syncErrorMessage: data.syncErrorMessage ?? undefined,
          recordsProcessed: data.recordsProcessed ?? undefined,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        },
        new UniqueEntityID(data.id),
      );

      if (syncStatusResult.isErr()) {
        return err(syncStatusResult.error);
      }

      return ok(syncStatusResult.value);
    } catch (error: any) {
      return err(error);
    }
  }

  async save(syncStatus: SyncStatus): Promise<Result<void>> {
    try {
      await this.db
        .insert(syncStatuses)
        .values({
          id: syncStatus.syncStatusId.toString(),
          curatorId: syncStatus.curatorId.value,
          syncState: syncStatus.syncState.value,
          lastSyncedAt: syncStatus.lastSyncedAt ?? null,
          lastSyncAttemptAt: syncStatus.lastSyncAttemptAt ?? null,
          syncErrorMessage: syncStatus.syncErrorMessage ?? null,
          recordsProcessed: syncStatus.recordsProcessed ?? null,
          createdAt: syncStatus.createdAt,
          updatedAt: syncStatus.updatedAt,
        })
        .onConflictDoUpdate({
          target: syncStatuses.curatorId,
          set: {
            syncState: syncStatus.syncState.value,
            lastSyncedAt: syncStatus.lastSyncedAt ?? null,
            lastSyncAttemptAt: syncStatus.lastSyncAttemptAt ?? null,
            syncErrorMessage: syncStatus.syncErrorMessage ?? null,
            recordsProcessed: syncStatus.recordsProcessed ?? null,
            updatedAt: syncStatus.updatedAt,
          },
        });

      return ok(undefined);
    } catch (error: any) {
      return err(error);
    }
  }
}
