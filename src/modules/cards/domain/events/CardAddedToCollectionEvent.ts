import { IDomainEvent } from '../../../../shared/domain/events/IDomainEvent';
import { UniqueEntityID } from '../../../../shared/domain/UniqueEntityID';
import { CardId } from '../value-objects/CardId';
import { CollectionId } from '../value-objects/CollectionId';
import { CuratorId } from '../value-objects/CuratorId';
import { EventNames } from '../../../../shared/infrastructure/events/EventConfig';
import { Result, ok } from '../../../../shared/core/Result';

export class CardAddedToCollectionEvent implements IDomainEvent {
  public readonly eventName = EventNames.CARD_ADDED_TO_COLLECTION;
  public readonly dateTimeOccurred: Date;

  private constructor(
    public readonly cardId: CardId,
    public readonly collectionId: CollectionId,
    public readonly addedBy: CuratorId,
    dateTimeOccurred?: Date,
  ) {
    this.dateTimeOccurred = dateTimeOccurred || new Date();
  }

  public static create(
    cardId: CardId,
    collectionId: CollectionId,
    addedBy: CuratorId,
  ): Result<CardAddedToCollectionEvent> {
    return ok(new CardAddedToCollectionEvent(cardId, collectionId, addedBy));
  }

  public static reconstruct(
    cardId: CardId,
    collectionId: CollectionId,
    addedBy: CuratorId,
    dateTimeOccurred: Date,
  ): Result<CardAddedToCollectionEvent> {
    return ok(new CardAddedToCollectionEvent(cardId, collectionId, addedBy, dateTimeOccurred));
  }

  getAggregateId(): UniqueEntityID {
    return this.collectionId.getValue();
  }
}
