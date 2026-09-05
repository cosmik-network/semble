import { IDomainEvent } from '../../../../shared/domain/events/IDomainEvent';
import { UniqueEntityID } from '../../../../shared/domain/UniqueEntityID';
import { CardId } from '../value-objects/CardId';
import { CuratorId } from '../value-objects/CuratorId';
import { EventNames } from '../../../../shared/infrastructure/events/EventConfig';
import { Result, ok } from '../../../../shared/core/Result';

export class UrlCardMetadataUpdatedEvent implements IDomainEvent {
  public readonly eventName = EventNames.URL_CARD_METADATA_UPDATED;
  public readonly dateTimeOccurred: Date;

  private constructor(
    public readonly cardId: CardId,
    public readonly curatorId: CuratorId,
    public readonly url: string,
    dateTimeOccurred?: Date,
  ) {
    this.dateTimeOccurred = dateTimeOccurred || new Date();
  }

  public static create(
    cardId: CardId,
    curatorId: CuratorId,
    url: string,
  ): Result<UrlCardMetadataUpdatedEvent> {
    return ok(new UrlCardMetadataUpdatedEvent(cardId, curatorId, url));
  }

  public static reconstruct(
    cardId: CardId,
    curatorId: CuratorId,
    url: string,
    dateTimeOccurred: Date,
  ): Result<UrlCardMetadataUpdatedEvent> {
    return ok(
      new UrlCardMetadataUpdatedEvent(cardId, curatorId, url, dateTimeOccurred),
    );
  }

  getAggregateId(): UniqueEntityID {
    return this.cardId.getValue();
  }
}
