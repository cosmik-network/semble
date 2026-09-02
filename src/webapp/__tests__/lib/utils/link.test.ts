import { describe, expect, it } from 'vitest';
import {
  SupportedPlatform,
  buildSembleQuery,
  detectUrlPlatform,
  encodeUrlParam,
  getDisplayUrl,
  getDomain,
  getSembleHref,
  getUrlFromSlug,
  isCollectionPage,
  isProfilePage,
} from '@/lib/utils/link';

// ─────────────────────────────────────────────
// getDomain
// ─────────────────────────────────────────────
describe('getDomain', () => {
  it('should return the hostname for a valid URL', () => {
    // Arrange
    const url = 'https://www.example.com/some/path?q=1';

    // Act
    const result = getDomain(url);

    // Assert
    expect(result).toBe('www.example.com');
  });

  it('should return the original string when the URL is invalid', () => {
    // Arrange
    const url = 'not a valid url';

    // Act
    const result = getDomain(url);

    // Assert
    expect(result).toBe(url);
  });
});

// ─────────────────────────────────────────────
// getDisplayUrl
// ─────────────────────────────────────────────
describe('getDisplayUrl', () => {
  it('should strip the scheme and the www prefix', () => {
    // Arrange
    const url = 'https://www.example.com/blog';

    // Act
    const result = getDisplayUrl(url);

    // Assert
    expect(result).toBe('example.com/blog');
  });

  it('should drop the trailing slash of a bare domain', () => {
    // Arrange
    const url = 'https://example.com/';

    // Act
    const result = getDisplayUrl(url);

    // Assert
    expect(result).toBe('example.com');
  });

  it('should preserve the path, query and hash when under the budget', () => {
    // Arrange
    const url = 'https://example.com/blog?q=1#top';

    // Act
    const result = getDisplayUrl(url, 30);

    // Assert
    expect(result).toBe('example.com/blog?q=1#top');
  });

  it('should cut off the path past the budget while keeping the host whole', () => {
    // Arrange
    const url =
      'https://a-very-long-domain-name.example.com/2026/08/12/us/politics/election';

    // Act
    const result = getDisplayUrl(url, 30);

    // Assert
    expect(result).toBe(
      'a-very-long-domain-name.example.com/2026/08/12/us/politics/electi…',
    );
  });

  it('should not truncate when no budget is given', () => {
    // Arrange
    const url = 'https://example.com/2026/08/12/us/politics/election?ref=home';

    // Act
    const result = getDisplayUrl(url);

    // Assert
    expect(result).toBe('example.com/2026/08/12/us/politics/election?ref=home');
  });

  it('should return the original string for a non-http(s) scheme', () => {
    // Arrange
    const url = 'mailto:someone@example.com';

    // Act
    const result = getDisplayUrl(url, 30);

    // Assert
    expect(result).toBe(url);
  });

  it('should return the original string when the URL is invalid', () => {
    // Arrange
    const url = 'not a valid url';

    // Act
    const result = getDisplayUrl(url, 30);

    // Assert
    expect(result).toBe(url);
  });
});

// ─────────────────────────────────────────────
// encodeUrlParam / getSembleHref / buildSembleQuery
// ─────────────────────────────────────────────
describe('encodeUrlParam', () => {
  it('should leave a plain URL readable', () => {
    expect(encodeUrlParam('https://example.com/path?q=1')).toBe(
      'https://example.com/path?q=1',
    );
  });

  it('should escape the fragment so the browser does not strip it', () => {
    expect(encodeUrlParam('https://example.com/path#section')).toBe(
      'https://example.com/path%23section',
    );
  });

  it('should escape query separators and existing escapes', () => {
    expect(encodeUrlParam('https://example.com/a%20b?x=1&y=a+b')).toBe(
      'https://example.com/a%2520b?x=1%26y=a%2Bb',
    );
  });

  it('should round-trip through a single decode', () => {
    const url = 'https://example.com/a%20b?x=1&y=a+b#frag';
    expect(new URLSearchParams(`id=${encodeUrlParam(url)}`).get('id')).toBe(
      url,
    );
  });
});

describe('getSembleHref', () => {
  it('should build the semble page link with id last', () => {
    expect(
      getSembleHref('https://example.com/path#section', {
        viaCardId: 'card-1',
        sembleTab: 'notes',
      }),
    ).toBe(
      '/url?viaCardId=card-1&sembleTab=notes&id=https://example.com/path%23section',
    );
  });

  it('should omit unset options', () => {
    expect(getSembleHref('https://example.com')).toBe(
      '/url?id=https://example.com',
    );
  });
});

describe('buildSembleQuery', () => {
  it('should re-encode only the id and keep other params raw', () => {
    const params = new URLSearchParams(
      '?id=https://example.com/a%23b&sembleTab=notes',
    );
    expect(buildSembleQuery(params)).toBe(
      '?id=https://example.com/a%23b&sembleTab=notes',
    );
  });

  it('should omit a param', () => {
    const params = new URLSearchParams('?viaCardId=x&id=https://example.com');
    expect(buildSembleQuery(params, { omit: 'viaCardId' })).toBe(
      '?id=https://example.com',
    );
  });

  it('should override an existing param in place and append a missing one', () => {
    const existing = new URLSearchParams(
      '?id=https://example.com&sembleTab=notes',
    );
    expect(buildSembleQuery(existing, { set: { sembleTab: 'similar' } })).toBe(
      '?id=https://example.com&sembleTab=similar',
    );
    const missing = new URLSearchParams('?id=https://example.com');
    expect(buildSembleQuery(missing, { set: { sembleTab: 'similar' } })).toBe(
      '?id=https://example.com&sembleTab=similar',
    );
  });
});

// ─────────────────────────────────────────────
// getUrlFromSlug
// ─────────────────────────────────────────────
describe('getUrlFromSlug', () => {
  it('should join slug segments with slashes', () => {
    // Arrange
    const slug = ['https:', 'example.com', 'path'];

    // Act
    const result = getUrlFromSlug(slug);

    // Assert
    expect(result).toBe('https://example.com/path');
  });

  it('should decode percent-encoded segments', () => {
    // Arrange
    const slug = ['https:', 'example.com', 'path%20with%20spaces'];

    // Act
    const result = getUrlFromSlug(slug);

    // Assert
    expect(result).toContain('path with spaces');
  });

  it('should normalise a malformed single-slash scheme to double-slash', () => {
    // Arrange — slug produces "https:/example.com" when joined, missing one slash
    const slug = ['https:/example.com', 'path'];

    // Act
    const result = getUrlFromSlug(slug);

    // Assert
    expect(result).toMatch(/^https:\/\/example\.com/);
  });

  it('should leave an already-correct double-slash scheme unchanged', () => {
    // Arrange
    const slug = ['https:', 'example.com'];

    // Act
    const result = getUrlFromSlug(slug);

    // Assert
    expect(result).toBe('https://example.com');
  });
});

// ─────────────────────────────────────────────
// isCollectionPage
// In jsdom, window.location.origin is 'http://localhost'.
// Relative URLs are resolved against that origin.
// ─────────────────────────────────────────────
describe('isCollectionPage', () => {
  it('should return true for a valid collection path', () => {
    // Arrange
    const url = '/profile/alice/collections/rkey123';

    // Act
    const result = isCollectionPage(url);

    // Assert
    expect(result).toBe(true);
  });

  it('should return false for a profile path without the collections segment', () => {
    // Arrange
    const url = '/profile/alice';

    // Act
    const result = isCollectionPage(url);

    // Assert
    expect(result).toBe(false);
  });

  it('should return false for an external URL', () => {
    // Arrange
    const url = 'https://bsky.app/profile/alice/collections/rkey123';

    // Act
    const result = isCollectionPage(url);

    // Assert
    expect(result).toBe(false);
  });
});

// ─────────────────────────────────────────────
// isProfilePage
// ─────────────────────────────────────────────
describe('isProfilePage', () => {
  it('should return true for a bare profile path', () => {
    // Arrange
    const url = '/profile/alice';

    // Act
    const result = isProfilePage(url);

    // Assert
    expect(result).toBe(true);
  });

  it('should return true for a profile subroute', () => {
    // Arrange
    const url = '/profile/alice/likes';

    // Act
    const result = isProfilePage(url);

    // Assert
    expect(result).toBe(true);
  });

  it('should return false for a non-profile path', () => {
    // Arrange
    const url = '/explore';

    // Act
    const result = isProfilePage(url);

    // Assert
    expect(result).toBe(false);
  });

  it('should return false for an external URL', () => {
    // Arrange
    const url = 'https://bsky.app/profile/alice';

    // Act
    const result = isProfilePage(url);

    // Assert
    expect(result).toBe(false);
  });
});

// ─────────────────────────────────────────────
// detectUrlPlatform
// ─────────────────────────────────────────────
describe('detectUrlPlatform', () => {
  // Semble
  it('should detect a semble collection page', () => {
    // Arrange
    const url = '/profile/alice/collections/rkey123';

    // Act
    const result = detectUrlPlatform(url);

    // Assert
    expect(result.type).toBe(SupportedPlatform.SEMBLE_COLLECTION);
    if (result.type === SupportedPlatform.SEMBLE_COLLECTION) {
      expect(result.handle).toBe('alice');
      expect(result.rkey).toBe('rkey123');
    }
  });

  it('should detect a semble profile page', () => {
    // Arrange
    const url = '/profile/alice';

    // Act
    const result = detectUrlPlatform(url);

    // Assert
    expect(result.type).toBe(SupportedPlatform.SEMBLE_PROFILE);
    if (result.type === SupportedPlatform.SEMBLE_PROFILE) {
      expect(result.handle).toBe('alice');
    }
  });

  // Bluesky
  it('should detect a Bluesky post', () => {
    // Arrange
    const url = 'https://bsky.app/profile/alice.bsky.social/post/abc123';

    // Act
    const result = detectUrlPlatform(url);

    // Assert
    expect(result.type).toBe(SupportedPlatform.BLUESKY_POST);
  });

  // Blacksky
  it('should detect a Blacksky post', () => {
    // Arrange
    const url = 'https://blacksky.community/profile/alice/post/abc123';

    // Act
    const result = detectUrlPlatform(url);

    // Assert
    expect(result.type).toBe(SupportedPlatform.BLACKSKY_POST);
  });

  // YouTube
  it('should detect a YouTube video from a youtu.be short link', () => {
    // Arrange
    const url = 'https://youtu.be/dQw4w9WgXcQ';

    // Act
    const result = detectUrlPlatform(url);

    // Assert
    expect(result.type).toBe(SupportedPlatform.YOUTUBE_VIDEO);
    expect(result.url).toMatch(/youtube\.com\/embed\/dQw4w9WgXcQ/);
  });

  it('should detect a YouTube video from a standard watch URL', () => {
    // Arrange
    const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

    // Act
    const result = detectUrlPlatform(url);

    // Assert
    expect(result.type).toBe(SupportedPlatform.YOUTUBE_VIDEO);
    expect(result.url).toMatch(/youtube\.com\/embed\/dQw4w9WgXcQ/);
  });

  it('should detect a YouTube Shorts URL', () => {
    // Arrange
    const url = 'https://www.youtube.com/shorts/abc123';

    // Act
    const result = detectUrlPlatform(url);

    // Assert
    expect(result.type).toBe(SupportedPlatform.YOUTUBE_VIDEO);
    expect(result.url).toMatch(/youtube\.com\/embed\/abc123/);
  });

  // Spotify
  it('should detect a Spotify track', () => {
    // Arrange
    const url = 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC';

    // Act
    const result = detectUrlPlatform(url);

    // Assert
    expect(result.type).toBe(SupportedPlatform.SPOTIFY);
    expect(result.url).toMatch(/spotify\.com\/embed\/track\//);
  });

  it('should detect a Spotify album', () => {
    // Arrange
    const url = 'https://open.spotify.com/album/6dVIqQ8qmQ5GBnJ9shOYGE';

    // Act
    const result = detectUrlPlatform(url);

    // Assert
    expect(result.type).toBe(SupportedPlatform.SPOTIFY);
    expect(result.url).toMatch(/spotify\.com\/embed\/album\//);
  });

  // Bandcamp
  it('should detect a Bandcamp album', () => {
    // Arrange
    const url = 'https://artist.bandcamp.com/album/my-album';

    // Act
    const result = detectUrlPlatform(url);

    // Assert
    expect(result.type).toBe(SupportedPlatform.BANDCAMP_ALBUM);
    expect(result.url).toMatch(/bandcamp\.com\/EmbeddedPlayer/);
  });

  it('should detect a Bandcamp track', () => {
    // Arrange
    const url = 'https://artist.bandcamp.com/track/my-track';

    // Act
    const result = detectUrlPlatform(url);

    // Assert
    expect(result.type).toBe(SupportedPlatform.BANDCAMP_TRACK);
    expect(result.url).toMatch(/bandcamp\.com\/EmbeddedPlayer/);
  });

  // SoundCloud
  it('should detect a SoundCloud track', () => {
    // Arrange
    const url = 'https://soundcloud.com/artist/track-name';

    // Act
    const result = detectUrlPlatform(url);

    // Assert
    expect(result.type).toBe(SupportedPlatform.SOUNDCLOUD_TRACK);
    expect(result.url).toMatch(/soundcloud\.com\/player/);
  });

  it('should detect a SoundCloud set', () => {
    // Arrange
    const url = 'https://soundcloud.com/artist/sets/my-playlist';

    // Act
    const result = detectUrlPlatform(url);

    // Assert
    expect(result.type).toBe(SupportedPlatform.SOUNDCLOUD_SET);
    expect(result.url).toMatch(/soundcloud\.com\/player/);
  });

  // plyr.fm
  it('should detect a plyr.fm track', () => {
    // Arrange
    const url = 'https://plyr.fm/track/abc123';

    // Act
    const result = detectUrlPlatform(url);

    // Assert
    expect(result.type).toBe(SupportedPlatform.PLYRFM_TRACK);
    expect(result.url).toMatch(/plyr\.fm\/embed\/track\/abc123/);
  });

  // Fallbacks
  it('should return DEFAULT for an unrecognised URL', () => {
    // Arrange
    const url = 'https://example.com/some/page';

    // Act
    const result = detectUrlPlatform(url);

    // Assert
    expect(result.type).toBe(SupportedPlatform.DEFAULT);
  });

  it('should return DEFAULT for an invalid URL', () => {
    // Arrange
    const url = 'not-a-url';

    // Act
    const result = detectUrlPlatform(url);

    // Assert
    expect(result.type).toBe(SupportedPlatform.DEFAULT);
  });
});
