import { UrlClassifier } from '../../infrastructure/UrlClassifier';
import { UrlType } from '../../domain/value-objects/UrlType';

describe('UrlClassifier', () => {
  describe('classifyUrl', () => {
    describe('Research URLs', () => {
      it('should classify arXiv URLs as RESEARCH', () => {
        const urls = [
          'https://arxiv.org/abs/2502.10834',
          'https://www.arxiv.org/abs/1234.5678',
          'http://arxiv.org/abs/physics/0001001',
        ];

        urls.forEach(url => {
          expect(UrlClassifier.classifyUrl(url)).toBe(UrlType.RESEARCH);
        });
      });

      it('should classify DOI URLs as RESEARCH', () => {
        const urls = [
          'https://doi.org/10.1000/182',
          'https://www.doi.org/10.1038/nature12373',
          'http://doi.org/10.1145/1234567.1234568',
        ];

        urls.forEach(url => {
          expect(UrlClassifier.classifyUrl(url)).toBe(UrlType.RESEARCH);
        });
      });

      it('should classify PubMed URLs as RESEARCH', () => {
        const urls = [
          'https://pubmed.ncbi.nlm.nih.gov/12345678/',
          'https://www.pubmed.ncbi.nlm.nih.gov/87654321/',
        ];

        urls.forEach(url => {
          expect(UrlClassifier.classifyUrl(url)).toBe(UrlType.RESEARCH);
        });
      });
    });

    describe('Video URLs', () => {
      it('should classify YouTube URLs as VIDEO', () => {
        const urls = [
          'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          'https://youtube.com/watch?v=abc123',
          'https://youtu.be/dQw4w9WgXcQ',
          'http://www.youtube.com/watch?v=test123',
        ];

        urls.forEach(url => {
          expect(UrlClassifier.classifyUrl(url)).toBe(UrlType.VIDEO);
        });
      });

      it('should classify Vimeo URLs as VIDEO', () => {
        const urls = [
          'https://vimeo.com/123456789',
          'https://www.vimeo.com/987654321',
        ];

        urls.forEach(url => {
          expect(UrlClassifier.classifyUrl(url)).toBe(UrlType.VIDEO);
        });
      });

      it('should classify TikTok URLs as VIDEO', () => {
        const urls = [
          'https://www.tiktok.com/@user/video/1234567890',
          'https://tiktok.com/@user/video/0987654321',
        ];

        urls.forEach(url => {
          expect(UrlClassifier.classifyUrl(url)).toBe(UrlType.VIDEO);
        });
      });
    });

    describe('Audio URLs', () => {
      it('should classify Spotify URLs as AUDIO', () => {
        const urls = [
          'https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh',
          'https://www.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M',
        ];

        urls.forEach(url => {
          expect(UrlClassifier.classifyUrl(url)).toBe(UrlType.AUDIO);
        });
      });

      it('should classify SoundCloud URLs as AUDIO', () => {
        const urls = [
          'https://soundcloud.com/user/track-name',
          'https://www.soundcloud.com/artist/song',
        ];

        urls.forEach(url => {
          expect(UrlClassifier.classifyUrl(url)).toBe(UrlType.AUDIO);
        });
      });
    });

    describe('Social Media URLs', () => {
      it('should classify Twitter/X URLs as SOCIAL', () => {
        const urls = [
          'https://twitter.com/user/status/1234567890',
          'https://www.twitter.com/username',
          'https://x.com/user/status/0987654321',
          'https://www.x.com/username',
        ];

        urls.forEach(url => {
          expect(UrlClassifier.classifyUrl(url)).toBe(UrlType.SOCIAL);
        });
      });

      it('should classify LinkedIn URLs as SOCIAL', () => {
        const urls = [
          'https://www.linkedin.com/in/username',
          'https://linkedin.com/company/company-name',
        ];

        urls.forEach(url => {
          expect(UrlClassifier.classifyUrl(url)).toBe(UrlType.SOCIAL);
        });
      });

      it('should classify Reddit URLs as SOCIAL', () => {
        const urls = [
          'https://www.reddit.com/r/programming',
          'https://reddit.com/user/username',
        ];

        urls.forEach(url => {
          expect(UrlClassifier.classifyUrl(url)).toBe(UrlType.SOCIAL);
        });
      });
    });

    describe('Software URLs', () => {
      it('should classify GitHub URLs as SOFTWARE', () => {
        const urls = [
          'https://github.com/user/repository',
          'https://www.github.com/org/project',
        ];

        urls.forEach(url => {
          expect(UrlClassifier.classifyUrl(url)).toBe(UrlType.SOFTWARE);
        });
      });

      it('should classify Stack Overflow URLs as SOFTWARE', () => {
        const urls = [
          'https://stackoverflow.com/questions/12345/how-to-do-something',
          'https://www.stackoverflow.com/users/123456/username',
        ];

        urls.forEach(url => {
          expect(UrlClassifier.classifyUrl(url)).toBe(UrlType.SOFTWARE);
        });
      });
    });

    describe('Book URLs', () => {
      it('should classify Amazon book URLs as BOOK', () => {
        const urls = [
          'https://www.amazon.com/Title-Author/dp/1234567890',
          'https://amazon.co.uk/Book-Title/dp/0987654321',
          'https://www.amazon.de/Buch-Titel/dp/1111111111',
        ];

        urls.forEach(url => {
          expect(UrlClassifier.classifyUrl(url)).toBe(UrlType.BOOK);
        });
      });

      it('should classify Goodreads URLs as BOOK', () => {
        const urls = [
          'https://www.goodreads.com/book/show/123456',
          'https://goodreads.com/author/show/789012',
        ];

        urls.forEach(url => {
          expect(UrlClassifier.classifyUrl(url)).toBe(UrlType.BOOK);
        });
      });
    });

    describe('Article URLs', () => {
      it('should classify news site URLs as ARTICLE', () => {
        const urls = [
          'https://www.bbc.com/news/world-12345678',
          'https://bbc.co.uk/news/uk-87654321',
          'https://www.nytimes.com/2024/01/01/world/article-title.html',
          'https://www.theguardian.com/world/2024/jan/01/article-title',
        ];

        urls.forEach(url => {
          expect(UrlClassifier.classifyUrl(url)).toBe(UrlType.ARTICLE);
        });
      });

      it('should classify Medium URLs as ARTICLE', () => {
        const urls = [
          'https://medium.com/@author/article-title-123abc',
          'https://www.medium.com/publication/article-title',
          'https://publication.medium.com/article-title-456def',
        ];

        urls.forEach(url => {
          expect(UrlClassifier.classifyUrl(url)).toBe(UrlType.ARTICLE);
        });
      });
    });

    describe('Event URLs', () => {
      it('should classify event platform URLs as EVENT', () => {
        const urls = [
          'https://www.eventbrite.com/e/event-name-tickets-123456789',
          'https://eventbrite.co.uk/e/event-tickets-987654321',
          'https://www.meetup.com/group-name/events/123456789/',
          'https://www.facebook.com/events/123456789012345/',
        ];

        urls.forEach(url => {
          expect(UrlClassifier.classifyUrl(url)).toBe(UrlType.EVENT);
        });
      });
    });

    describe('Unmatched URLs', () => {
      it('should return null for URLs that do not match any pattern', () => {
        const urls = [
          'https://example.com',
          'https://www.random-site.org/page',
          'https://unknown-domain.net/content',
        ];

        urls.forEach(url => {
          expect(UrlClassifier.classifyUrl(url)).toBeNull();
        });
      });
    });
  });

  describe('getPatterns', () => {
    it('should return all configured patterns', () => {
      const patterns = UrlClassifier.getPatterns();
      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0]).toHaveProperty('regex');
      expect(patterns[0]).toHaveProperty('type');
    });
  });

  describe('addPattern', () => {
    it('should add a new pattern', () => {
      const initialCount = UrlClassifier.getPatterns().length;
      
      UrlClassifier.addPattern({
        regex: /^https?:\/\/(www\.)?test-site\.com\//i,
        type: UrlType.LINK,
        description: 'Test site',
      });

      expect(UrlClassifier.getPatterns().length).toBe(initialCount + 1);
      expect(UrlClassifier.classifyUrl('https://test-site.com/page')).toBe(UrlType.LINK);
    });
  });

  describe('removePattern', () => {
    it('should remove a pattern by description', () => {
      // Add a pattern first
      UrlClassifier.addPattern({
        regex: /^https?:\/\/(www\.)?removable-site\.com\//i,
        type: UrlType.LINK,
        description: 'Removable site',
      });

      // Verify it was added
      expect(UrlClassifier.classifyUrl('https://removable-site.com/page')).toBe(UrlType.LINK);

      // Remove it
      const removed = UrlClassifier.removePattern('Removable site');
      expect(removed).toBe(true);

      // Verify it was removed
      expect(UrlClassifier.classifyUrl('https://removable-site.com/page')).toBeNull();
    });

    it('should return false when trying to remove non-existent pattern', () => {
      const removed = UrlClassifier.removePattern('Non-existent pattern');
      expect(removed).toBe(false);
    });
  });
});
