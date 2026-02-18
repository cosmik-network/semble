import { IDomainEvent } from '../../domain/events/IDomainEvent';
import { CardAddedToLibraryEvent } from '../../../modules/cards/domain/events/CardAddedToLibraryEvent';
import { CardAddedToCollectionEvent } from '../../../modules/cards/domain/events/CardAddedToCollectionEvent';
import { CardRemovedFromLibraryEvent } from '../../../modules/cards/domain/events/CardRemovedFromLibraryEvent';
import { CardRemovedFromCollectionEvent } from '../../../modules/cards/domain/events/CardRemovedFromCollectionEvent';
import { CollectionCreatedEvent } from '../../../modules/cards/domain/events/CollectionCreatedEvent';
import { UserFollowedTargetEvent } from '../../../modules/user/domain/events/UserFollowedTargetEvent';
import { UserUnfollowedTargetEvent } from '../../../modules/user/domain/events/UserUnfollowedTargetEvent';
import { CardId } from '../../../modules/cards/domain/value-objects/CardId';
import { CollectionId } from '../../../modules/cards/domain/value-objects/CollectionId';
import { CuratorId } from '../../../modules/cards/domain/value-objects/CuratorId';
import { DID } from '../../../modules/user/domain/value-objects/DID';
import { FollowTargetType } from '../../../modules/user/domain/value-objects/FollowTargetType';
import { UniqueEntityID } from '../../domain/UniqueEntityID';
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
  addedAt: string;
}

export interface SerializedCardAddedToCollectionEvent extends SerializedEvent {
  eventType: typeof EventNames.CARD_ADDED_TO_COLLECTION;
  cardId: string;
  collectionId: string;
  addedBy: string;
  addedAt: string;
}

export interface SerializedCardRemovedFromLibraryEvent extends SerializedEvent {
  eventType: typeof EventNames.CARD_REMOVED_FROM_LIBRARY;
  cardId: string;
  curatorId: string;
}

export interface SerializedCardRemovedFromCollectionEvent
  extends SerializedEvent {
  eventType: typeof EventNames.CARD_REMOVED_FROM_COLLECTION;
  cardId: string;
  collectionId: string;
  removedBy: string;
}

export interface SerializedCollectionCreatedEvent extends SerializedEvent {
  eventType: typeof EventNames.COLLECTION_CREATED;
  collectionId: string;
  authorId: string;
  collectionName: string;
}

export interface SerializedUserFollowedTargetEvent extends SerializedEvent {
  eventType: typeof EventNames.USER_FOLLOWED_TARGET;
  followId: string;
  followerId: string;
  targetId: string;
  targetType: 'USER' | 'COLLECTION';
  createdAt: string;
}

export interface SerializedUserUnfollowedTargetEvent extends SerializedEvent {
  eventType: typeof EventNames.USER_UNFOLLOWED_TARGET;
  followId: string;
  followerId: string;
  targetId: string;
  targetType: 'USER' | 'COLLECTION';
}

export type SerializedEventUnion =
  | SerializedCardAddedToLibraryEvent
  | SerializedCardAddedToCollectionEvent
  | SerializedCardRemovedFromLibraryEvent
  | SerializedCardRemovedFromCollectionEvent
  | SerializedCollectionCreatedEvent
  | SerializedUserFollowedTargetEvent
  | SerializedUserUnfollowedTargetEvent;

export class EventMapper {
  static toSerialized(event: IDomainEvent): SerializedEventUnion {
    if (event instanceof CardAddedToLibraryEvent) {
      return {
        eventType: EventNames.CARD_ADDED_TO_LIBRARY,
        aggregateId: event.getAggregateId().toString(),
        dateTimeOccurred: event.dateTimeOccurred.toISOString(),
        cardId: event.cardId.getValue().toString(),
        curatorId: event.curatorId.value,
        addedAt: event.addedAt.toISOString(),
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
        addedAt: event.addedAt.toISOString(),
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

    if (event instanceof CardRemovedFromCollectionEvent) {
      return {
        eventType: EventNames.CARD_REMOVED_FROM_COLLECTION,
        aggregateId: event.getAggregateId().toString(),
        dateTimeOccurred: event.dateTimeOccurred.toISOString(),
        cardId: event.cardId.getValue().toString(),
        collectionId: event.collectionId.getValue().toString(),
        removedBy: event.removedBy.value,
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

    if (event instanceof UserFollowedTargetEvent) {
      return {
        eventType: EventNames.USER_FOLLOWED_TARGET,
        aggregateId: event.getAggregateId().toString(),
        dateTimeOccurred: event.dateTimeOccurred.toISOString(),
        followId: event.followId.toString(),
        followerId: event.followerId.value,
        targetId: event.targetId,
        targetType: event.targetType.value,
        createdAt: event.createdAt.toISOString(),
      };
    }

    if (event instanceof UserUnfollowedTargetEvent) {
      return {
        eventType: EventNames.USER_UNFOLLOWED_TARGET,
        aggregateId: event.getAggregateId().toString(),
        dateTimeOccurred: event.dateTimeOccurred.toISOString(),
        followId: event.followId.toString(),
        followerId: event.followerId.value,
        targetId: event.targetId,
        targetType: event.targetType.value,
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
        const addedAt = new Date(eventData.addedAt);
        const dateTimeOccurred = new Date(eventData.dateTimeOccurred);

        return CardAddedToLibraryEvent.reconstruct(
          cardId,
          curatorId,
          addedAt,
          dateTimeOccurred,
        ).unwrap();
      }
      case EventNames.CARD_ADDED_TO_COLLECTION: {
        const cardId = CardId.createFromString(eventData.cardId).unwrap();
        const collectionId = CollectionId.createFromString(
          eventData.collectionId,
        ).unwrap();
        const addedBy = CuratorId.create(eventData.addedBy).unwrap();
        const addedAt = new Date(eventData.addedAt);
        const dateTimeOccurred = new Date(eventData.dateTimeOccurred);

        return CardAddedToCollectionEvent.reconstruct(
          cardId,
          collectionId,
          addedBy,
          addedAt,
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
      case EventNames.CARD_REMOVED_FROM_COLLECTION: {
        const cardId = CardId.createFromString(eventData.cardId).unwrap();
        const collectionId = CollectionId.createFromString(
          eventData.collectionId,
        ).unwrap();
        const removedBy = CuratorId.create(eventData.removedBy).unwrap();
        const dateTimeOccurred = new Date(eventData.dateTimeOccurred);

        return CardRemovedFromCollectionEvent.reconstruct(
          cardId,
          collectionId,
          removedBy,
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
      case EventNames.USER_FOLLOWED_TARGET: {
        const followId = new UniqueEntityID(eventData.followId);
        const followerId = DID.create(eventData.followerId).unwrap();
        const targetType = FollowTargetType.create(
          eventData.targetType as any,
        ).unwrap();
        const createdAt = new Date(eventData.createdAt);
        const dateTimeOccurred = new Date(eventData.dateTimeOccurred);
        return UserFollowedTargetEvent.reconstruct(
          followId,
          followerId,
          eventData.targetId,
          targetType,
          createdAt,
          dateTimeOccurred,
        ).unwrap();
      }
      case EventNames.USER_UNFOLLOWED_TARGET: {
        const followId = new UniqueEntityID(eventData.followId);
        const followerId = DID.create(eventData.followerId).unwrap();
        const targetType = FollowTargetType.create(
          eventData.targetType as any,
        ).unwrap();
        const dateTimeOccurred = new Date(eventData.dateTimeOccurred);
        return UserUnfollowedTargetEvent.reconstruct(
          followId,
          followerId,
          eventData.targetId,
          targetType,
          dateTimeOccurred,
        ).unwrap();
      }
      default:
        throw new Error(`Unknown event type for deserialization: ${eventData}`);
    }
  }
}
