import { IDomainEvent } from '../../../../shared/domain/events/IDomainEvent';
import { UniqueEntityID } from '../../../../shared/domain/UniqueEntityID';
import { CardId } from '../value-objects/CardId';
import { CollectionId } from '../value-objects/CollectionId';
import { CuratorId } from '../value-objects/CuratorId';
import { EventNames } from '../../../../shared/infrastructure/events/EventConfig';
import { Result, ok } from '../../../../shared/core/Result';

export class CardRemovedFromCollectionEvent implements IDomainEvent {
  public readonly eventName = EventNames.CARD_REMOVED_FROM_COLLECTION;
  public readonly dateTimeOccurred: Date;

  private constructor(
    public readonly cardId: CardId,
    public readonly collectionId: CollectionId,
    public readonly removedBy: CuratorId,
    dateTimeOccurred?: Date,
  ) {
    this.dateTimeOccurred = dateTimeOccurred || new Date();
  }

  public static create(
    cardId: CardId,
    collectionId: CollectionId,
    removedBy: CuratorId,
  ): Result<CardRemovedFromCollectionEvent> {
    return ok(
      new CardRemovedFromCollectionEvent(cardId, collectionId, removedBy),
    );
  }

  public static reconstruct(
    cardId: CardId,
    collectionId: CollectionId,
    removedBy: CuratorId,
    dateTimeOccurred: Date,
  ): Result<CardRemovedFromCollectionEvent> {
    return ok(
      new CardRemovedFromCollectionEvent(
        cardId,
        collectionId,
        removedBy,
        dateTimeOccurred,
      ),
    );
  }

  getAggregateId(): UniqueEntityID {
    return this.collectionId.getValue();
  }
}
