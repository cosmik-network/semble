import { describe, expect, it } from 'vitest';
import { UrlType, ActivitySource, ActivityType } from '@semble/types';
import {
  feedEmptyState,
  hasFeedFilters,
} from '@/features/feeds/lib/feedEmptyState';
import { FeedView } from '@/features/feeds/lib/feedOptions';

const VIEWS: FeedView[] = ['global', 'following', 'bskyFollowing'];

// ─────────────────────────────────────────────
// feedEmptyState — filters
// ─────────────────────────────────────────────
describe('feedEmptyState with filters', () => {
  it('should blame the filters rather than the view, whichever feed it is', () => {
    // Act
    const messages = VIEWS.map(
      (view) => feedEmptyState({ view, hasFilters: true }).message,
    );

    // Assert
    expect(new Set(messages)).toEqual(new Set(['Nothing matches these filters']));
  });

  it('should offer to clear the filters', () => {
    // Act
    const state = feedEmptyState({ view: 'global', hasFilters: true });

    // Assert
    expect(state.action).toEqual({
      kind: 'clearFilters',
      label: 'Clear filters',
    });
  });
});

// ─────────────────────────────────────────────
// feedEmptyState — per view
// ─────────────────────────────────────────────
describe('feedEmptyState without filters', () => {
  it('should give every view its own message', () => {
    // Act
    const messages = VIEWS.map(
      (view) => feedEmptyState({ view, hasFilters: false }).message,
    );

    // Assert
    expect(new Set(messages).size).toBe(VIEWS.length);
  });

  it('should send both follow-based feeds to the profiles shelf', () => {
    // Act
    const following = feedEmptyState({ view: 'following', hasFilters: false });
    const bsky = feedEmptyState({ view: 'bskyFollowing', hasFilters: false });

    // Assert
    expect(following.action).toEqual({
      kind: 'link',
      label: 'Find people to follow',
      href: '/explore/profiles',
    });
    expect(bsky.action).toEqual(following.action);
  });

  it('should name Bluesky in the Bluesky feed message', () => {
    // Act
    const state = feedEmptyState({ view: 'bskyFollowing', hasFilters: false });

    // Assert
    expect(state.message).toContain('Bluesky');
    expect(state.icon).toBe('bluesky');
  });

  it('should offer nothing to do on an empty global feed', () => {
    // Act
    const state = feedEmptyState({ view: 'global', hasFilters: false });

    // Assert
    expect(state.action).toBeUndefined();
  });
});

// ─────────────────────────────────────────────
// hasFeedFilters
// ─────────────────────────────────────────────
describe('hasFeedFilters', () => {
  const none = {
    feedUrlType: null,
    feedSource: null,
    feedActivityType: null,
  };

  it('should report no filters when all three are unset', () => {
    // Assert
    expect(hasFeedFilters(none)).toBe(false);
  });

  it('should report a filter for url type, source or activity type', () => {
    // Assert
    expect(hasFeedFilters({ ...none, feedUrlType: UrlType.VIDEO })).toBe(true);
    expect(hasFeedFilters({ ...none, feedSource: ActivitySource.MARGIN })).toBe(
      true,
    );
    expect(
      hasFeedFilters({ ...none, feedActivityType: ActivityType.CARD_COLLECTED }),
    ).toBe(true);
  });
});
