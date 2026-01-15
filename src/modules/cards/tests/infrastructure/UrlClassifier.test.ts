import { UrlClassifier } from '../../infrastructure/UrlClassifier';
import { UrlType } from '../../domain/value-objects/UrlType';

describe('UrlClassifier Unit Tests', () => {
  describe('classifyUrl with specific test URLs', () => {
    it('should classify Bluesky post URL as SOCIAL', () => {
      const url = 'https://bsky.app/profile/alexip718.com/post/3mbtxcksgj22d';
      const result = UrlClassifier.classifyUrl(url);
      expect(result).toBe(UrlType.SOCIAL);
    });

    it('should classify Blacksky community post URL as SOCIAL', () => {
      const url =
        'https://blacksky.community/profile/did:plc:aax2d4gyu4vmlccwdtgci474/post/3mbur3zuius2o';
      const result = UrlClassifier.classifyUrl(url);
      expect(result).toBe(UrlType.SOCIAL);
    });

    it('should classify Deer social post URL as SOCIAL', () => {
      const url =
        'https://deer.social/profile/did:plc:25j5r47em2gmbiypflegz6bk/post/3mbsjeqolzs2y';
      const result = UrlClassifier.classifyUrl(url);
      expect(result).toBe(UrlType.SOCIAL);
    });

    it('should classify Smokesignal event URL as EVENT', () => {
      const url =
        'https://smokesignal.events/did:plc:2zmxikig2sj7gqaezl5gntae/3m7542ymkcu2j';
      const result = UrlClassifier.classifyUrl(url);
      expect(result).toBe(UrlType.EVENT);
    });

    it('should classify Tangled repo URL as SOFTWARE', () => {
      const url = 'https://tangled.org/zat.dev/zat';
      const result = UrlClassifier.classifyUrl(url);
      expect(result).toBe(UrlType.SOFTWARE);
    });

    it('should classify Leaflet article URL as ARTICLE', () => {
      const url = 'https://aicoding.leaflet.pub/3mbuc4mohwc2k';
      const result = UrlClassifier.classifyUrl(url);
      expect(result).toBe(UrlType.ARTICLE);
    });
  });

  describe('pattern matching validation', () => {
    it('should have all expected patterns configured', () => {
      const patterns = UrlClassifier.getPatterns();

      // Check that we have patterns for the expected services
      const descriptions = patterns.map((p) => p.description);

      expect(descriptions).toContain('Bluesky post');
      expect(descriptions).toContain('Blacksky community post');
      expect(descriptions).toContain('Deer social post');
      expect(descriptions).toContain('Smokesignal event');
      expect(descriptions).toContain('Tangled repo');
      expect(descriptions).toContain('Leaflet article');
    });

    it('should return null for URLs that do not match any pattern', () => {
      const unmatchedUrls = [
        'https://example.com/some/path',
        'https://unknown-service.com/profile/user/post/123',
        'https://random-site.org/content',
      ];

      unmatchedUrls.forEach((url) => {
        expect(UrlClassifier.classifyUrl(url)).toBeNull();
      });
    });
  });
});
