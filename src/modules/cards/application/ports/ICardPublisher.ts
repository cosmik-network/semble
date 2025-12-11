import { Card } from '../../domain/Card';
import { Result } from '../../../../shared/core/Result';
import { UseCaseError } from '../../../../shared/core/UseCaseError';
import { CuratorId } from '../../domain/value-objects/CuratorId';
import { PublishedRecordId } from '../../domain/value-objects/PublishedRecordId';

export interface ICardPublisher {
  publishCardToLibrary(
    card: Card,
    curatorId: CuratorId,
    parentCardPublishedRecordId?: PublishedRecordId,
    viaCardPublishedRecordId?: PublishedRecordId,
  ): Promise<Result<PublishedRecordId, UseCaseError>>;

  unpublishCardFromLibrary(
    recordId: PublishedRecordId,
    curatorId: CuratorId,
  ): Promise<Result<void, UseCaseError>>;
}
