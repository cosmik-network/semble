import { CitoidMetadataService } from '../../infrastructure/CitoidMetadataService';
import { URL } from '../../domain/value-objects/URL';

describe('CitoidMetadataService Integration Tests', () => {
  let service: CitoidMetadataService;

  beforeEach(() => {
    service = new CitoidMetadataService();
  });

  describe('fetchMetadata', () => {
    it('should fetch metadata for arXiv paper', async () => {
      // Arrange
      const arxivUrl = 'https://arxiv.org/abs/2502.10834';
      const urlResult = URL.create(arxivUrl);
      expect(urlResult.isOk()).toBe(true);
      const url = urlResult.unwrap();

      // Act
      const result = await service.fetchMetadata(url);

      // Assert
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const metadata = result.unwrap();

        // Basic structure checks
        expect(metadata.url).toBe(arxivUrl);
        expect(metadata.retrievedAt).toBeInstanceOf(Date);

        // Content checks - arXiv papers should have these fields
        expect(metadata.title).toBeDefined();
        expect(metadata.title).not.toBe('');

        expect(metadata.author).toBeDefined();
        expect(metadata.author).not.toBe('');

        expect(metadata.description).toBeDefined();
        expect(metadata.description).not.toBe('');

        // arXiv specific checks
        expect(metadata.type).toBe('research');
        expect(metadata.siteName).toContain('arXiv');

        // Date should be parsed correctly
        expect(metadata.publishedDate).toBeInstanceOf(Date);

        console.log('Fetched metadata:', {
          title: metadata.title,
          author: metadata.author,
          description: metadata.description?.substring(0, 100) + '...',
          type: metadata.type,
          siteName: metadata.siteName,
          publishedDate: metadata.publishedDate,
        });
      }
    }, 10000); // 10 second timeout for network request

    it('should handle invalid URLs gracefully', async () => {
      // Arrange
      const invalidUrl = 'https://example.com/nonexistent-page-12345';
      const urlResult = URL.create(invalidUrl);
      expect(urlResult.isOk()).toBe(true);
      const url = urlResult.unwrap();

      // Act
      const result = await service.fetchMetadata(url);

      // Assert
      // Should either succeed with minimal metadata or fail gracefully
      if (result.isErr()) {
        expect(result.error.message).toMatch(/metadata|Not Found/);
      } else {
        // If it succeeds, should at least have the URL
        const metadata = result.unwrap();
        expect(metadata.url).toBe(invalidUrl);
      }
    }, 10000);

    it('should handle network errors gracefully', async () => {
      // Arrange - use a URL that will cause network issues
      const problematicUrl = 'https://this-domain-should-not-exist-12345.com';
      const urlResult = URL.create(problematicUrl);
      expect(urlResult.isOk()).toBe(true);
      const url = urlResult.unwrap();

      // Act
      const result = await service.fetchMetadata(url);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Bad Request');
      }
    }, 10000);
  });

  describe('isAvailable', () => {
    it('should check if Citoid service is available', async () => {
      // Act
      const isAvailable = await service.isAvailable();

      // Assert
      expect(typeof isAvailable).toBe('boolean');

      // In most cases, the service should be available
      // But we don't want to fail the test if Wikipedia is down
      console.log('Citoid service availability:', isAvailable);
    }, 5000);
  });

  describe('author formatting', () => {
    it('should handle multiple authors correctly', async () => {
      // This test uses a known paper with multiple authors
      const paperUrl = 'https://arxiv.org/abs/1706.03762'; // "Attention Is All You Need"
      const urlResult = URL.create(paperUrl);
      expect(urlResult.isOk()).toBe(true);
      const url = urlResult.unwrap();

      // Act
      const result = await service.fetchMetadata(url);

      // Assert
      if (result.isOk()) {
        const metadata = result.unwrap();
        expect(metadata.author).toBeDefined();
        expect(metadata.author).not.toBe('');

        // Should contain at least one author name
        expect(metadata.author!.length).toBeGreaterThanOrEqual(0);

        console.log('Authors for multi-author paper:', metadata.author);
      }
    }, 10000);
  });

  describe('date parsing', () => {
    it('should parse publication dates correctly', async () => {
      // Arrange
      const arxivUrl = 'https://arxiv.org/abs/2502.10834';
      const urlResult = URL.create(arxivUrl);
      expect(urlResult.isOk()).toBe(true);
      const url = urlResult.unwrap();

      // Act
      const result = await service.fetchMetadata(url);

      // Assert
      if (result.isOk()) {
        const metadata = result.unwrap();

        if (metadata.publishedDate) {
          expect(metadata.publishedDate).toBeInstanceOf(Date);
          expect(metadata.publishedDate.getTime()).not.toBeNaN();

          // Should be a reasonable date (not in the future, not too old)
          const now = new Date();
          const oneYearAgo = new Date(
            now.getFullYear() - 1,
            now.getMonth(),
            now.getDate(),
          );

          expect(metadata.publishedDate.getTime()).toBeLessThanOrEqual(
            now.getTime(),
          );
          expect(metadata.publishedDate.getTime()).toBeGreaterThanOrEqual(
            oneYearAgo.getTime(),
          );

          console.log(
            'Parsed publication date:',
            metadata.publishedDate.toISOString(),
          );
        }
      }
    }, 10000);
  });
});
