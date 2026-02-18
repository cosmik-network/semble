export const EventNames = {
  CARD_ADDED_TO_LIBRARY: 'CardAddedToLibraryEvent',
  CARD_ADDED_TO_COLLECTION: 'CardAddedToCollectionEvent',
  COLLECTION_CREATED: 'CollectionCreatedEvent',
  CARD_REMOVED_FROM_LIBRARY: 'CardRemovedFromLibraryEvent',
  CARD_REMOVED_FROM_COLLECTION: 'CardRemovedFromCollectionEvent',
  USER_FOLLOWED_TARGET: 'USER_FOLLOWED_TARGET',
  USER_UNFOLLOWED_TARGET: 'USER_UNFOLLOWED_TARGET',
} as const;

export type EventName = (typeof EventNames)[keyof typeof EventNames];
