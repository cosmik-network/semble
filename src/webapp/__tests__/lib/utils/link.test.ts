import { describe, expect, it } from 'vitest';
import {
  SupportedPlatform,
  detectUrlPlatform,
  getDomain,
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
