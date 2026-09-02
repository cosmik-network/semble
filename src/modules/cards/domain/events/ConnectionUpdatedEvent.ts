import { IDomainEvent } from '../../../../shared/domain/events/IDomainEvent';
import { UniqueEntityID } from '../../../../shared/domain/UniqueEntityID';
import { ConnectionId } from '../value-objects/ConnectionId';
import { CuratorId } from '../value-objects/CuratorId';
import { EventNames } from '../../../../shared/infrastructure/events/EventConfig';
import { Result, ok } from '../../../../shared/core/Result';

export class ConnectionUpdatedEvent implements IDomainEvent {
  public readonly eventName = EventNames.CONNECTION_UPDATED;
  public readonly dateTimeOccurred: Date;

  private constructor(
    public readonly connectionId: ConnectionId,
    public readonly curatorId: CuratorId,
    dateTimeOccurred?: Date,
  ) {
    this.dateTimeOccurred = dateTimeOccurred || new Date();
  }

  public static create(
    connectionId: ConnectionId,
    curatorId: CuratorId,
  ): Result<ConnectionUpdatedEvent> {
    return ok(new ConnectionUpdatedEvent(connectionId, curatorId));
  }

  public static reconstruct(
    connectionId: ConnectionId,
    curatorId: CuratorId,
    dateTimeOccurred: Date,
  ): Result<ConnectionUpdatedEvent> {
    return ok(
      new ConnectionUpdatedEvent(connectionId, curatorId, dateTimeOccurred),
    );
  }

  getAggregateId(): UniqueEntityID {
    return this.connectionId.getValue();
  }
}
