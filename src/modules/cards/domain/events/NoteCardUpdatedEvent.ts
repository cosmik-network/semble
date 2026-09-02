import { IDomainEvent } from '../../../../shared/domain/events/IDomainEvent';
import { UniqueEntityID } from '../../../../shared/domain/UniqueEntityID';
import { CardId } from '../value-objects/CardId';
import { CuratorId } from '../value-objects/CuratorId';
import { EventNames } from '../../../../shared/infrastructure/events/EventConfig';
import { Result, ok } from '../../../../shared/core/Result';

export class NoteCardUpdatedEvent implements IDomainEvent {
  public readonly eventName = EventNames.NOTE_CARD_UPDATED;
  public readonly dateTimeOccurred: Date;

  private constructor(
    public readonly cardId: CardId,
    public readonly curatorId: CuratorId,
    dateTimeOccurred?: Date,
  ) {
    this.dateTimeOccurred = dateTimeOccurred || new Date();
  }

  public static create(
    cardId: CardId,
    curatorId: CuratorId,
  ): Result<NoteCardUpdatedEvent> {
    return ok(new NoteCardUpdatedEvent(cardId, curatorId));
  }

  public static reconstruct(
    cardId: CardId,
    curatorId: CuratorId,
    dateTimeOccurred: Date,
  ): Result<NoteCardUpdatedEvent> {
    return ok(new NoteCardUpdatedEvent(cardId, curatorId, dateTimeOccurred));
  }

  getAggregateId(): UniqueEntityID {
    return this.cardId.getValue();
  }
}
