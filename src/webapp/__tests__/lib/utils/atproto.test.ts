import { describe, expect, it } from 'vitest';
import { getRecordKey, getPostUriFromUrl } from '@/lib/utils/atproto';

// ─────────────────────────────────────────────
// getRecordKey
// ─────────────────────────────────────────────
describe('getRecordKey', () => {
  it('should return the last path segment from an AT Protocol URI', () => {
    // Arrange
    const path = 'at://did:plc:xyz/app.bsky.feed.post/3k7xyzabc';

    // Act
    const result = getRecordKey(path);

    // Assert
    expect(result).toBe('3k7xyzabc');
  });

  it('should return the value when there is no slash separator', () => {
    // Arrange
    const path = 'record-key-only';

    // Act
    const result = getRecordKey(path);

    // Assert
    expect(result).toBe('record-key-only');
  });

  it('should return an empty string when the path is empty', () => {
    // Arrange
    const path = '';

    // Act
    const result = getRecordKey(path);

    // Assert
    expect(result).toBe('');
  });

  it('should return an empty string when the path ends with a slash', () => {
    // Arrange — trailing slash means the last segment is an empty string
    const path = 'at://did:plc:xyz/at.margin.bookmark/';

    // Act
    const result = getRecordKey(path);

    // Assert
    expect(result).toBe('');
  });
});

// ─────────────────────────────────────────────
// getPostUriFromUrl
// ─────────────────────────────────────────────
describe('getPostUriFromUrl', () => {
  it('should convert a Bluesky profile URL to an AT Protocol URI', () => {
    // Arrange
    const url = 'https://bsky.app/profile/alice.bsky.social/post/3k7xyzabc';

    // Act
    const result = getPostUriFromUrl(url);

    // Assert
    expect(result).toBe('at://alice.bsky.social/app.bsky.feed.post/3k7xyzabc');
  });

  it('should work when the handle is a DID', () => {
    // Arrange
    const url = 'https://bsky.app/profile/did:plc:abc123/post/3k7xyzabc';

    // Act
    const result = getPostUriFromUrl(url);

    // Assert
    expect(result).toBe('at://did:plc:abc123/app.bsky.feed.post/3k7xyzabc');
  });

  it('should return the URL unchanged when it does not match the profile/post pattern', () => {
    // Arrange
    const url = 'https://bsky.app/profile/alice.bsky.social';

    // Act
    const result = getPostUriFromUrl(url);

    // Assert
    expect(result).toBe(url);
  });

  it('should return the input unchanged when it is an arbitrary string', () => {
    // Arrange
    const url = 'not-a-url-at-all';

    // Act
    const result = getPostUriFromUrl(url);

    // Assert
    expect(result).toBe(url);
  });

  it('should return the input unchanged when it is an empty string', () => {
    // Arrange
    const url = '';

    // Act
    const result = getPostUriFromUrl(url);

    // Assert
    expect(result).toBe(url);
  });
});
