import { IDomainEvent } from '../../../../shared/domain/events/IDomainEvent';
import { UniqueEntityID } from '../../../../shared/domain/UniqueEntityID';
import { CollectionId } from '../value-objects/CollectionId';
import { CuratorId } from '../value-objects/CuratorId';
import { EventNames } from '../../../../shared/infrastructure/events/EventConfig';
import { Result, ok } from '../../../../shared/core/Result';

export class CollectionUpdatedEvent implements IDomainEvent {
  public readonly eventName = EventNames.COLLECTION_UPDATED;
  public readonly dateTimeOccurred: Date;

  private constructor(
    public readonly collectionId: CollectionId,
    public readonly authorId: CuratorId,
    dateTimeOccurred?: Date,
  ) {
    this.dateTimeOccurred = dateTimeOccurred || new Date();
  }

  public static create(
    collectionId: CollectionId,
    authorId: CuratorId,
  ): Result<CollectionUpdatedEvent> {
    return ok(new CollectionUpdatedEvent(collectionId, authorId));
  }

  public static reconstruct(
    collectionId: CollectionId,
    authorId: CuratorId,
    dateTimeOccurred: Date,
  ): Result<CollectionUpdatedEvent> {
    return ok(
      new CollectionUpdatedEvent(collectionId, authorId, dateTimeOccurred),
    );
  }

  getAggregateId(): UniqueEntityID {
    return this.collectionId.getValue();
  }
}
