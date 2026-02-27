import { AggregateRoot } from '../../../shared/domain/AggregateRoot';
import { UniqueEntityID } from '../../../shared/domain/UniqueEntityID';
import { ok, err, Result } from '../../../shared/core/Result';
import { ConnectionId } from './value-objects/ConnectionId';
import { ConnectionType } from './value-objects/ConnectionType';
import { UrlOrCardId } from './value-objects/UrlOrCardId';
import { ConnectionNote } from './value-objects/ConnectionNote';
import { CuratorId } from './value-objects/CuratorId';
import { PublishedRecordId } from './value-objects/PublishedRecordId';
import { ConnectionCreatedEvent } from './events/ConnectionCreatedEvent';
import { ConnectionRemovedEvent } from './events/ConnectionRemovedEvent';

export class ConnectionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConnectionValidationError';
  }
}

interface ConnectionProps {
  source: UrlOrCardId;
  target: UrlOrCardId;
  type?: ConnectionType;
  note?: ConnectionNote;
  curatorId: CuratorId;
  publishedRecordId?: PublishedRecordId;
  createdAt: Date;
  updatedAt: Date;
}

export class Connection extends AggregateRoot<ConnectionProps> {
  get connectionId(): ConnectionId {
    return ConnectionId.create(this._id).unwrap();
  }

  get source(): UrlOrCardId {
    return this.props.source;
  }

  get target(): UrlOrCardId {
    return this.props.target;
  }

  get type(): ConnectionType | undefined {
    return this.props.type;
  }

  get note(): ConnectionNote | undefined {
    return this.props.note;
  }

  get curatorId(): CuratorId {
    return this.props.curatorId;
  }

  get publishedRecordId(): PublishedRecordId | undefined {
    return this.props.publishedRecordId;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get isPublished(): boolean {
    return this.props.publishedRecordId !== undefined;
  }

  private constructor(props: ConnectionProps, id?: UniqueEntityID) {
    super(props, id);
  }

  public static create(
    props: Omit<ConnectionProps, 'createdAt' | 'updatedAt'> & {
      createdAt?: Date;
      updatedAt?: Date;
    },
    id?: UniqueEntityID,
  ): Result<Connection, ConnectionValidationError> {
    // Validate that source and target are not the same
    if (props.source.equals(props.target)) {
      return err(
        new ConnectionValidationError(
          'Connection source and target cannot be the same',
        ),
      );
    }

    const now = new Date();
    const connectionProps: ConnectionProps = {
      ...props,
      createdAt: props.createdAt || now,
      updatedAt: props.updatedAt || now,
    };

    const connection = new Connection(connectionProps, id);
    connection.raiseCreatedEvent();
    return ok(connection);
  }

  public updateNote(
    note: ConnectionNote,
  ): Result<void, ConnectionValidationError> {
    this.props.note = note;
    this.props.updatedAt = new Date();
    return ok(undefined);
  }

  public removeNote(): Result<void, ConnectionValidationError> {
    this.props.note = undefined;
    this.props.updatedAt = new Date();
    return ok(undefined);
  }

  private raiseCreatedEvent(): Result<void> {
    const event = ConnectionCreatedEvent.create(
      this.connectionId,
      this.curatorId,
    );

    if (event.isErr()) {
      return err(new Error(event.error.message));
    }

    this.addDomainEvent(event.value);
    return ok(undefined);
  }

  public markForRemoval(): Result<void> {
    const event = ConnectionRemovedEvent.create(
      this.connectionId,
      this.curatorId,
    );

    if (event.isErr()) {
      return err(new Error(event.error.message));
    }

    this.addDomainEvent(event.value);
    return ok(undefined);
  }

  public markAsPublished(publishedRecordId: PublishedRecordId): void {
    this.props.publishedRecordId = publishedRecordId;
    this.props.updatedAt = new Date();
  }

  public markAsUnpublished(): void {
    this.props.publishedRecordId = undefined;
    this.props.updatedAt = new Date();
  }
}
