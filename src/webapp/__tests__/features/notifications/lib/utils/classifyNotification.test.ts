import { describe, expect, it } from 'vitest';
import type {
  ConnectionCreatedNotificationItem,
  FollowNotificationItem,
  CardCollectionNotificationItem,
} from '@/api-client';
import { NotificationType } from '@/api-client';
import { classifyNotification } from '@/features/notifications/lib/utils';

// ─────────────────────────────────────────────
// Minimal typed stubs
// classifyNotification only reads item.type, so we only need that field.
// Casting keeps TypeScript's discriminated-union checks intact.
// ─────────────────────────────────────────────
const makeConnection = (type: ConnectionCreatedNotificationItem['type']) =>
  ({ type }) as ConnectionCreatedNotificationItem;

const makeFollow = (type: FollowNotificationItem['type']) =>
  ({ type }) as FollowNotificationItem;

const makeCardCollection = (type: CardCollectionNotificationItem['type']) =>
  ({ type }) as CardCollectionNotificationItem;

// ─────────────────────────────────────────────
// classifyNotification
// ─────────────────────────────────────────────
describe('classifyNotification', () => {
  // — connection kind —
  it('should classify USER_CONNECTED_YOUR_URL as connection', () => {
    // Arrange
    const item = makeConnection(NotificationType.USER_CONNECTED_YOUR_URL);

    // Act
    const result = classifyNotification(item);

    // Assert
    expect(result.kind).toBe('connection');
  });

  it('should classify USER_CONNECTED_YOUR_POST as connection', () => {
    // Arrange
    const item = makeConnection(NotificationType.USER_CONNECTED_YOUR_POST);

    // Act
    const result = classifyNotification(item);

    // Assert
    expect(result.kind).toBe('connection');
  });

  it('should classify USER_CONNECTED_YOUR_COLLECTION as connection', () => {
    // Arrange
    const item = makeConnection(
      NotificationType.USER_CONNECTED_YOUR_COLLECTION,
    );

    // Act
    const result = classifyNotification(item);

    // Assert
    expect(result.kind).toBe('connection');
  });

  // — follow kind —
  it('should classify USER_FOLLOWED_YOU as follow', () => {
    // Arrange
    const item = makeFollow(NotificationType.USER_FOLLOWED_YOU);

    // Act
    const result = classifyNotification(item);

    // Assert
    expect(result.kind).toBe('follow');
  });

  it('should classify USER_FOLLOWED_YOUR_COLLECTION as follow', () => {
    // Arrange
    const item = makeFollow(NotificationType.USER_FOLLOWED_YOUR_COLLECTION);

    // Act
    const result = classifyNotification(item);

    // Assert
    expect(result.kind).toBe('follow');
  });

  // — cardCollection kind —
  it('should classify USER_ADDED_YOUR_CARD as cardCollection', () => {
    // Arrange
    const item = makeCardCollection(NotificationType.USER_ADDED_YOUR_CARD);

    // Act
    const result = classifyNotification(item);

    // Assert
    expect(result.kind).toBe('cardCollection');
  });

  it('should classify USER_ADDED_YOUR_BSKY_POST as cardCollection', () => {
    // Arrange
    const item = makeCardCollection(NotificationType.USER_ADDED_YOUR_BSKY_POST);

    // Act
    const result = classifyNotification(item);

    // Assert
    expect(result.kind).toBe('cardCollection');
  });

  it('should classify USER_ADDED_YOUR_COLLECTION as cardCollection', () => {
    // Arrange
    const item = makeCardCollection(
      NotificationType.USER_ADDED_YOUR_COLLECTION,
    );

    // Act
    const result = classifyNotification(item);

    // Assert
    expect(result.kind).toBe('cardCollection');
  });

  it('should classify USER_ADDED_TO_YOUR_COLLECTION as cardCollection', () => {
    // Arrange
    const item = makeCardCollection(
      NotificationType.USER_ADDED_TO_YOUR_COLLECTION,
    );

    // Act
    const result = classifyNotification(item);

    // Assert
    expect(result.kind).toBe('cardCollection');
  });

  // — item pass-through —
  it('should return the original item reference in the result', () => {
    // Arrange
    const item = makeConnection(NotificationType.USER_CONNECTED_YOUR_URL);

    // Act
    const result = classifyNotification(item);

    // Assert
    expect(result.item).toBe(item);
  });
});
