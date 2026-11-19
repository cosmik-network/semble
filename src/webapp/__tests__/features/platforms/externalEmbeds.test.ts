import { describe, expect, it } from 'vitest';
import { getEmbedSource } from '@/features/platforms/common/lib/externalEmbeds';
import { detectUrlPlatform } from '@/lib/utils/link';

const sourceOf = (url: string) => getEmbedSource(detectUrlPlatform(url).type);

describe('getEmbedSource', () => {
  it('maps iframe-embedded platforms to their source', () => {
    expect(sourceOf('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(
      'youtube',
    );
    expect(sourceOf('https://open.spotify.com/track/abc123')).toBe('spotify');
    expect(sourceOf('https://soundcloud.com/artist/track')).toBe('soundcloud');
    expect(sourceOf('https://artist.bandcamp.com/album/name')).toBe(
      'bandcamp',
    );
  });

  it('returns null for non-iframe links', () => {
    expect(sourceOf('https://example.com/article')).toBeNull();
    expect(sourceOf('https://bsky.app/profile/a.bsky.social/post/123')).toBe(
      null,
    );
  });
});
