import { Collection } from '../../domain/Collection';
import { Result } from '../../../../shared/core/Result';
import { UseCaseError } from '../../../../shared/core/UseCaseError';
import { Card } from '../../domain/Card';
import {
  PublishedRecordId,
  PublishedRecordIdProps,
} from '../../domain/value-objects/PublishedRecordId';
import { CuratorId } from '../../domain/value-objects/CuratorId';

export interface ICollectionPublisher {
  publish(
    collection: Collection,
  ): Promise<Result<PublishedRecordId, UseCaseError>>;

  unpublish(recordId: PublishedRecordId): Promise<Result<void, UseCaseError>>;
  publishCardAddedToCollection(
    card: Card,
    collection: Collection,
    curatorId: CuratorId,
    viaCardPublishedRecordId?: PublishedRecordIdProps,
  ): Promise<Result<PublishedRecordId, UseCaseError>>;
  unpublishCardAddedToCollection(
    recordId: PublishedRecordId,
  ): Promise<Result<void, UseCaseError>>;
}
