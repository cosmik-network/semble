import { AggregateRoot } from 'src/shared/domain/AggregateRoot';
import { UniqueEntityID } from 'src/shared/domain/UniqueEntityID';
import { Guard, IGuardArgument } from 'src/shared/core/Guard';
import { err, ok, Result } from 'src/shared/core/Result';
import { DID } from 'src/modules/user/domain/value-objects/DID';
import { SyncState } from './value-objects/SyncState';

export interface SyncStatusProps {
  curatorId: DID;
  syncState: SyncState;
  lastSyncedAt?: Date;
  lastSyncAttemptAt?: Date;
  syncErrorMessage?: string;
  recordsProcessed?: number;
  createdAt: Date;
  updatedAt: Date;
}

export class SyncStatus extends AggregateRoot<SyncStatusProps> {
  get syncStatusId(): UniqueEntityID {
    return this._id;
  }

  get curatorId(): DID {
    return this.props.curatorId;
  }

  get syncState(): SyncState {
    return this.props.syncState;
  }

  get lastSyncedAt(): Date | undefined {
    return this.props.lastSyncedAt;
  }

  get lastSyncAttemptAt(): Date | undefined {
    return this.props.lastSyncAttemptAt;
  }

  get syncErrorMessage(): string | undefined {
    return this.props.syncErrorMessage;
  }

  get recordsProcessed(): number | undefined {
    return this.props.recordsProcessed;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  public markSyncInProgress(): void {
    this.props.syncState = SyncState.inProgress();
    this.props.lastSyncAttemptAt = new Date();
    this.props.updatedAt = new Date();
  }

  public markSyncCompleted(recordsProcessed: number): void {
    this.props.syncState = SyncState.completed();
    this.props.lastSyncedAt = new Date();
    this.props.recordsProcessed = recordsProcessed;
    this.props.syncErrorMessage = undefined;
    this.props.updatedAt = new Date();
  }

  public markSyncFailed(errorMessage: string): void {
    this.props.syncState = SyncState.failed();
    this.props.syncErrorMessage = errorMessage;
    this.props.updatedAt = new Date();
  }

  private constructor(props: SyncStatusProps, id?: UniqueEntityID) {
    super(props, id);
  }

  public static create(
    props: SyncStatusProps,
    id?: UniqueEntityID,
  ): Result<SyncStatus> {
    const guardArgs: IGuardArgument[] = [
      { argument: props.curatorId, argumentName: 'curatorId' },
      { argument: props.syncState, argumentName: 'syncState' },
      { argument: props.createdAt, argumentName: 'createdAt' },
      { argument: props.updatedAt, argumentName: 'updatedAt' },
    ];

    const guardResult = Guard.againstNullOrUndefinedBulk(guardArgs);

    if (guardResult.isErr()) {
      return err(new Error(guardResult.error));
    }

    const syncStatus = new SyncStatus(props, id);

    return ok(syncStatus);
  }

  public static createNew(curatorId: DID): Result<SyncStatus> {
    const now = new Date();

    return SyncStatus.create({
      curatorId,
      syncState: SyncState.notSynced(),
      createdAt: now,
      updatedAt: now,
    });
  }
}
