import { Result, ok, err } from 'src/shared/core/Result';
import { SyncStatus } from '../../domain/SyncStatus';
import { ISyncStatusRepository } from '../../domain/repositories/ISyncStatusRepository';
import { DID } from 'src/modules/user/domain/value-objects/DID';

export class InMemorySyncStatusRepository implements ISyncStatusRepository {
  private static instance: InMemorySyncStatusRepository;
  private syncStatuses: Map<string, SyncStatus> = new Map();

  private constructor() {}

  public static getInstance(): InMemorySyncStatusRepository {
    if (!InMemorySyncStatusRepository.instance) {
      InMemorySyncStatusRepository.instance =
        new InMemorySyncStatusRepository();
    }
    return InMemorySyncStatusRepository.instance;
  }

  async findByCuratorId(curatorId: DID): Promise<Result<SyncStatus | null>> {
    try {
      const syncStatus = this.syncStatuses.get(curatorId.value);
      return ok(syncStatus || null);
    } catch (error: any) {
      return err(error);
    }
  }

  async save(syncStatus: SyncStatus): Promise<Result<void>> {
    try {
      this.syncStatuses.set(syncStatus.curatorId.value, syncStatus);
      return ok(undefined);
    } catch (error: any) {
      return err(error);
    }
  }

  // Helper method for testing
  clear(): void {
    this.syncStatuses.clear();
  }
}
