import { describe, expect, it } from 'vitest';
import { UrlType } from '@semble/types';
import {
  FEED_DESTINATIONS,
  TYPE_DESTINATIONS,
  feedSettingsFor,
  resolveFeedAction,
} from '@/features/explore/lib/feedDestinations';

// ─────────────────────────────────────────────
// FEED_DESTINATIONS
// ─────────────────────────────────────────────
describe('FEED_DESTINATIONS', () => {
  it('should list global, following and bskyFollowing in that order', () => {
    // Act
    const views = FEED_DESTINATIONS.map((d) => d.feedView);

    // Assert
    expect(views).toEqual(['global', 'following', 'bskyFollowing']);
  });

  it('should not pre-filter any feed card by url type', () => {
    // Assert
    expect(FEED_DESTINATIONS.every((d) => d.urlType === null)).toBe(true);
  });

  it('should require auth for following and bskyFollowing only', () => {
    // Act
    const gated = FEED_DESTINATIONS.filter((d) => d.requiresAuth).map(
      (d) => d.feedView,
    );

    // Assert
    expect(gated).toEqual(['following', 'bskyFollowing']);
  });
});

// ─────────────────────────────────────────────
// TYPE_DESTINATIONS
// ─────────────────────────────────────────────
describe('TYPE_DESTINATIONS', () => {
  it('should cover every UrlType exactly once', () => {
    // Act
    const covered = TYPE_DESTINATIONS.map((d) => d.urlType).sort();
    const expected = Object.values(UrlType).sort();

    // Assert
    expect(covered).toEqual(expected);
  });

  it('should send every type tile to the global feed', () => {
    // Assert
    expect(TYPE_DESTINATIONS.every((d) => d.feedView === 'global')).toBe(true);
  });

  it('should not gate any type tile behind auth', () => {
    // Assert
    expect(TYPE_DESTINATIONS.every((d) => !d.requiresAuth)).toBe(true);
  });

  it('should give every destination a unique id', () => {
    // Arrange
    const all = [...FEED_DESTINATIONS, ...TYPE_DESTINATIONS];

    // Act
    const ids = new Set(all.map((d) => d.id));

    // Assert
    expect(ids.size).toBe(all.length);
  });
});

// ─────────────────────────────────────────────
// feedSettingsFor
// ─────────────────────────────────────────────
describe('feedSettingsFor', () => {
  it('should clear source and activity type for a feed card', () => {
    // Arrange
    const following = FEED_DESTINATIONS.find(
      (d) => d.feedView === 'following',
    )!;

    // Act
    const patch = feedSettingsFor(following);

    // Assert
    expect(patch).toEqual({
      feedView: 'following',
      feedUrlType: null,
      feedSource: null,
      feedActivityType: null,
    });
  });

  it('should set the url type and pin the view to global for a type tile', () => {
    // Arrange
    const video = TYPE_DESTINATIONS.find((d) => d.urlType === UrlType.VIDEO)!;

    // Act
    const patch = feedSettingsFor(video);

    // Assert
    expect(patch).toEqual({
      feedView: 'global',
      feedUrlType: UrlType.VIDEO,
      feedSource: null,
      feedActivityType: null,
    });
  });
});

// ─────────────────────────────────────────────
// resolveFeedAction
// ─────────────────────────────────────────────
describe('resolveFeedAction', () => {
  it('should navigate for an ungated destination even while auth is loading', () => {
    // Act
    const action = resolveFeedAction({
      requiresAuth: false,
      isAuthenticated: false,
      isAuthLoading: true,
    });

    // Assert
    expect(action).toBe('navigate');
  });

  it('should disable a gated destination while auth is loading', () => {
    // Act
    const action = resolveFeedAction({
      requiresAuth: true,
      isAuthenticated: false,
      isAuthLoading: true,
    });

    // Assert
    expect(action).toBe('disabled');
  });

  it('should send a signed-out reader to login for a gated destination', () => {
    // Act
    const action = resolveFeedAction({
      requiresAuth: true,
      isAuthenticated: false,
      isAuthLoading: false,
    });

    // Assert
    expect(action).toBe('login');
  });

  it('should navigate a signed-in reader to a gated destination', () => {
    // Act
    const action = resolveFeedAction({
      requiresAuth: true,
      isAuthenticated: true,
      isAuthLoading: false,
    });

    // Assert
    expect(action).toBe('navigate');
  });
});
