import { Connection } from '../../domain/Connection';
import { Result } from '../../../../shared/core/Result';
import { UseCaseError } from '../../../../shared/core/UseCaseError';
import { PublishedRecordId } from '../../domain/value-objects/PublishedRecordId';

export interface IConnectionPublisher {
  publish(
    connection: Connection,
  ): Promise<Result<PublishedRecordId, UseCaseError>>;

  unpublish(recordId: PublishedRecordId): Promise<Result<void, UseCaseError>>;
}
