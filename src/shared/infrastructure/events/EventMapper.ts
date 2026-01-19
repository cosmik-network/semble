import { IDomainEvent } from '../../domain/events/IDomainEvent';
import { CardAddedToLibraryEvent } from '../../../modules/cards/domain/events/CardAddedToLibraryEvent';
import { CardAddedToCollectionEvent } from '../../../modules/cards/domain/events/CardAddedToCollectionEvent';
import { CardRemovedFromLibraryEvent } from '../../../modules/cards/domain/events/CardRemovedFromLibraryEvent';
import { CollectionCreatedEvent } from '../../../modules/cards/domain/events/CollectionCreatedEvent';
import { CardId } from '../../../modules/cards/domain/value-objects/CardId';
import { CollectionId } from '../../../modules/cards/domain/value-objects/CollectionId';
import { CuratorId } from '../../../modules/cards/domain/value-objects/CuratorId';
import { EventNames } from './EventConfig';

export interface SerializedEvent {
  eventType: string;
  aggregateId: string;
  dateTimeOccurred: string;
}

export interface SerializedCardAddedToLibraryEvent extends SerializedEvent {
  eventType: typeof EventNames.CARD_ADDED_TO_LIBRARY;
  cardId: string;
  curatorId: string;
}

export interface SerializedCardAddedToCollectionEvent extends SerializedEvent {
  eventType: typeof EventNames.CARD_ADDED_TO_COLLECTION;
  cardId: string;
  collectionId: string;
  addedBy: string;
}

export interface SerializedCardRemovedFromLibraryEvent extends SerializedEvent {
  eventType: typeof EventNames.CARD_REMOVED_FROM_LIBRARY;
  cardId: string;
  curatorId: string;
}

export interface SerializedCollectionCreatedEvent extends SerializedEvent {
  eventType: typeof EventNames.COLLECTION_CREATED;
  collectionId: string;
  authorId: string;
  collectionName: string;
}

export type SerializedEventUnion =
  | SerializedCardAddedToLibraryEvent
  | SerializedCardAddedToCollectionEvent
  | SerializedCardRemovedFromLibraryEvent
  | SerializedCollectionCreatedEvent;

export class EventMapper {
  static toSerialized(event: IDomainEvent): SerializedEventUnion {
    if (event instanceof CardAddedToLibraryEvent) {
      return {
        eventType: EventNames.CARD_ADDED_TO_LIBRARY,
        aggregateId: event.getAggregateId().toString(),
        dateTimeOccurred: event.dateTimeOccurred.toISOString(),
        cardId: event.cardId.getValue().toString(),
        curatorId: event.curatorId.value,
      };
    }

    if (event instanceof CardAddedToCollectionEvent) {
      return {
        eventType: EventNames.CARD_ADDED_TO_COLLECTION,
        aggregateId: event.getAggregateId().toString(),
        dateTimeOccurred: event.dateTimeOccurred.toISOString(),
        cardId: event.cardId.getValue().toString(),
        collectionId: event.collectionId.getValue().toString(),
        addedBy: event.addedBy.value,
      };
    }

    if (event instanceof CardRemovedFromLibraryEvent) {
      return {
        eventType: EventNames.CARD_REMOVED_FROM_LIBRARY,
        aggregateId: event.getAggregateId().toString(),
        dateTimeOccurred: event.dateTimeOccurred.toISOString(),
        cardId: event.cardId.getValue().toString(),
        curatorId: event.curatorId.value,
      };
    }

    if (event instanceof CollectionCreatedEvent) {
      return {
        eventType: EventNames.COLLECTION_CREATED,
        aggregateId: event.getAggregateId().toString(),
        dateTimeOccurred: event.dateTimeOccurred.toISOString(),
        collectionId: event.collectionId.getValue().toString(),
        authorId: event.authorId.value,
        collectionName: event.collectionName,
      };
    }

    throw new Error(
      `Unknown event type for serialization: ${event.constructor.name}`,
    );
  }

  static fromSerialized(eventData: SerializedEventUnion): IDomainEvent {
    switch (eventData.eventType) {
      case EventNames.CARD_ADDED_TO_LIBRARY: {
        const cardId = CardId.createFromString(eventData.cardId).unwrap();
        const curatorId = CuratorId.create(eventData.curatorId).unwrap();
        const dateTimeOccurred = new Date(eventData.dateTimeOccurred);

        return CardAddedToLibraryEvent.reconstruct(
          cardId,
          curatorId,
          dateTimeOccurred,
        ).unwrap();
      }
      case EventNames.CARD_ADDED_TO_COLLECTION: {
        const cardId = CardId.createFromString(eventData.cardId).unwrap();
        const collectionId = CollectionId.createFromString(
          eventData.collectionId,
        ).unwrap();
        const addedBy = CuratorId.create(eventData.addedBy).unwrap();
        const dateTimeOccurred = new Date(eventData.dateTimeOccurred);

        return CardAddedToCollectionEvent.reconstruct(
          cardId,
          collectionId,
          addedBy,
          dateTimeOccurred,
        ).unwrap();
      }
      case EventNames.CARD_REMOVED_FROM_LIBRARY: {
        const cardId = CardId.createFromString(eventData.cardId).unwrap();
        const curatorId = CuratorId.create(eventData.curatorId).unwrap();
        const dateTimeOccurred = new Date(eventData.dateTimeOccurred);

        return CardRemovedFromLibraryEvent.reconstruct(
          cardId,
          curatorId,
          dateTimeOccurred,
        ).unwrap();
      }
      case EventNames.COLLECTION_CREATED: {
        const collectionId = CollectionId.createFromString(
          eventData.collectionId,
        ).unwrap();
        const authorId = CuratorId.create(eventData.authorId).unwrap();
        const dateTimeOccurred = new Date(eventData.dateTimeOccurred);

        return CollectionCreatedEvent.reconstruct(
          collectionId,
          authorId,
          eventData.collectionName,
          dateTimeOccurred,
        ).unwrap();
      }
      default:
        throw new Error(`Unknown event type for deserialization: ${eventData}`);
    }
  }
}
