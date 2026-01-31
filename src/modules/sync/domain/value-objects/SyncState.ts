import { Result, ok, err } from 'src/shared/core/Result';

export enum SyncStateEnum {
  NOT_SYNCED = 'NOT_SYNCED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export class SyncState {
  private constructor(private readonly _value: SyncStateEnum) {}

  get value(): SyncStateEnum {
    return this._value;
  }

  public static create(state: string): Result<SyncState> {
    const upperState = state.toUpperCase();
    if (!Object.values(SyncStateEnum).includes(upperState as SyncStateEnum)) {
      return err(
        new Error(
          `Invalid sync state: ${state}. Must be one of: ${Object.values(SyncStateEnum).join(', ')}`,
        ),
      );
    }
    return ok(new SyncState(upperState as SyncStateEnum));
  }

  public static notSynced(): SyncState {
    return new SyncState(SyncStateEnum.NOT_SYNCED);
  }

  public static inProgress(): SyncState {
    return new SyncState(SyncStateEnum.IN_PROGRESS);
  }

  public static completed(): SyncState {
    return new SyncState(SyncStateEnum.COMPLETED);
  }

  public static failed(): SyncState {
    return new SyncState(SyncStateEnum.FAILED);
  }

  public isNotSynced(): boolean {
    return this._value === SyncStateEnum.NOT_SYNCED;
  }

  public isInProgress(): boolean {
    return this._value === SyncStateEnum.IN_PROGRESS;
  }

  public isCompleted(): boolean {
    return this._value === SyncStateEnum.COMPLETED;
  }

  public isFailed(): boolean {
    return this._value === SyncStateEnum.FAILED;
  }

  public equals(other: SyncState): boolean {
    return this._value === other._value;
  }
}
