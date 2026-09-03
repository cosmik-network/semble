import { describe, expect, it } from 'vitest';
import { normalizeHandle } from '@/features/feeds/lib/bskyHandle';

// ─────────────────────────────────────────────
// normalizeHandle
// ─────────────────────────────────────────────
describe('normalizeHandle', () => {
  it('should strip the @ a handle is usually copied with', () => {
    // Assert
    expect(normalizeHandle('@alice.bsky.social')).toBe('alice.bsky.social');
  });

  it('should trim surrounding whitespace and lower case the handle', () => {
    // Assert
    expect(normalizeHandle('  Alice.BSKY.social ')).toBe('alice.bsky.social');
  });

  it('should return an empty string when nothing usable is left', () => {
    // Assert
    expect(normalizeHandle('  @ ')).toBe('');
  });
});
