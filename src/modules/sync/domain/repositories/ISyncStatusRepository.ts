import { Result } from 'src/shared/core/Result';
import { SyncStatus } from '../SyncStatus';
import { DID } from 'src/modules/user/domain/value-objects/DID';

export interface ISyncStatusRepository {
  findByCuratorId(curatorId: DID): Promise<Result<SyncStatus | null>>;
  findAndLockByCuratorId(curatorId: DID): Promise<Result<SyncStatus | null>>;
  save(syncStatus: SyncStatus): Promise<Result<void>>;
}
