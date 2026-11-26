import { IDomainEvent } from '../../../../shared/domain/events/IDomainEvent';
import { UniqueEntityID } from '../../../../shared/domain/UniqueEntityID';
import { CardId } from '../value-objects/CardId';
import { CuratorId } from '../value-objects/CuratorId';
import { CardTypeEnum } from '../value-objects/CardType';
import { EventNames } from '../../../../shared/infrastructure/events/EventConfig';
import { Result, ok } from '../../../../shared/core/Result';

/**
 * Snapshot of the removed card, carried so async consumers can act without
 * re-reading Postgres — the card row may be hard-deleted before the event is
 * processed. Only the fields consumers need are included (the search worker
 * needs the annotation passage key); all are optional for backward
 * compatibility with previously-queued events.
 */
export interface RemovedCardSnapshot {
  cardType: CardTypeEnum;
  url?: string;
  /** Normalized TextQuoteSelector exacts for annotation cards */
  exactNormalized?: string[];
}

export class CardRemovedFromLibraryEvent implements IDomainEvent {
  public readonly eventName = EventNames.CARD_REMOVED_FROM_LIBRARY;
  public readonly dateTimeOccurred: Date;

  private constructor(
    public readonly cardId: CardId,
    public readonly curatorId: CuratorId,
    dateTimeOccurred?: Date,
    public readonly removedCard?: RemovedCardSnapshot,
  ) {
    this.dateTimeOccurred = dateTimeOccurred || new Date();
  }

  public static create(
    cardId: CardId,
    curatorId: CuratorId,
    removedCard?: RemovedCardSnapshot,
  ): Result<CardRemovedFromLibraryEvent> {
    return ok(
      new CardRemovedFromLibraryEvent(
        cardId,
        curatorId,
        undefined,
        removedCard,
      ),
    );
  }

  public static reconstruct(
    cardId: CardId,
    curatorId: CuratorId,
    dateTimeOccurred: Date,
    removedCard?: RemovedCardSnapshot,
  ): Result<CardRemovedFromLibraryEvent> {
    return ok(
      new CardRemovedFromLibraryEvent(
        cardId,
        curatorId,
        dateTimeOccurred,
        removedCard,
      ),
    );
  }

  getAggregateId(): UniqueEntityID {
    return this.cardId.getValue();
  }
}
