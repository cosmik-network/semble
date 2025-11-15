import { Result } from 'src/shared/core/Result';

export type FirehoseEventType = 'create' | 'update' | 'delete';

export interface IFirehoseEventDuplicationService {
  hasEventBeenProcessed(
    atUri: string,
    cid: string | null,
    operation: FirehoseEventType,
  ): Promise<Result<boolean>>;

  hasBeenDeleted(atUri: string): Promise<Result<boolean>>;
}
