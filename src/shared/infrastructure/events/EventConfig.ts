export const EventNames = {
  CARD_ADDED_TO_LIBRARY: 'CardAddedToLibraryEvent',
  CARD_ADDED_TO_COLLECTION: 'CardAddedToCollectionEvent',
  COLLECTION_CREATED: 'CollectionCreatedEvent',
  CARD_REMOVED_FROM_LIBRARY: 'CardRemovedFromLibraryEvent',
  CARD_REMOVED_FROM_COLLECTION: 'CardRemovedFromCollectionEvent',
  URL_CARD_METADATA_UPDATED: 'UrlCardMetadataUpdatedEvent',
  USER_FOLLOWED_TARGET: 'USER_FOLLOWED_TARGET',
  USER_UNFOLLOWED_TARGET: 'USER_UNFOLLOWED_TARGET',
  CONNECTION_CREATED: 'ConnectionCreatedEvent',
  CONNECTION_REMOVED: 'ConnectionRemovedEvent',
} as const;

export type EventName = (typeof EventNames)[keyof typeof EventNames];
