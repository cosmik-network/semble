import { CompositeMetadataService, DefaultServicePreference } from '../../infrastructure/CompositeMetadataService';
import { IMetadataService } from '../../domain/services/IMetadataService';
import { UrlMetadata } from '../../domain/value-objects/UrlMetadata';
import { URL } from '../../domain/value-objects/URL';
import { UrlType } from '../../domain/value-objects/UrlType';
import { Result, ok, err } from '../../../../shared/core/Result';

// Mock metadata services
class MockIFramelyService implements IMetadataService {
  constructor(private mockResult: Result<UrlMetadata>) {}

  async fetchMetadata(url: URL): Promise<Result<UrlMetadata>> {
    return this.mockResult;
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }
}

class MockCitoidService implements IMetadataService {
  constructor(private mockResult: Result<UrlMetadata>) {}

  async fetchMetadata(url: URL): Promise<Result<UrlMetadata>> {
    return this.mockResult;
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }
}

describe('CompositeMetadataService', () => {
  describe('URL Classification Integration', () => {
    it('should override metadata service type with URL classifier for YouTube URLs', async () => {
      // Arrange
      const youtubeUrl = URL.create('https://www.youtube.com/watch?v=dQw4w9WgXcQ').unwrap();
      
      // Mock Iframely returning 'link' type
      const iframelyMetadata = UrlMetadata.create({
        url: youtubeUrl.value,
        title: 'Test Video',
        type: UrlType.LINK, // Wrong type from service
      }).unwrap();
      
      const iframelyService = new MockIFramelyService(ok(iframelyMetadata));
      const citoidService = new MockCitoidService(err(new Error('Service failed')));
      
      const compositeService = new CompositeMetadataService(
        iframelyService,
        citoidService,
        { defaultService: DefaultServicePreference.IFRAMELY }
      );

      // Act
      const result = await compositeService.fetchMetadata(youtubeUrl);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metadata = result.unwrap();
        expect(metadata.type).toBe(UrlType.VIDEO); // Should be overridden by classifier
        expect(metadata.title).toBe('Test Video'); // Other fields should remain
      }
    });

    it('should override metadata service type with URL classifier for arXiv URLs', async () => {
      // Arrange
      const arxivUrl = URL.create('https://arxiv.org/abs/2502.10834').unwrap();
      
      // Mock both services returning wrong types
      const iframelyMetadata = UrlMetadata.create({
        url: arxivUrl.value,
        title: 'Research Paper',
        type: UrlType.ARTICLE, // Wrong type from service
      }).unwrap();
      
      const citoidMetadata = UrlMetadata.create({
        url: arxivUrl.value,
        title: 'Research Paper',
        type: UrlType.LINK, // Wrong type from service
      }).unwrap();
      
      const iframelyService = new MockIFramelyService(ok(iframelyMetadata));
      const citoidService = new MockCitoidService(ok(citoidMetadata));
      
      const compositeService = new CompositeMetadataService(
        iframelyService,
        citoidService,
        { defaultService: DefaultServicePreference.IFRAMELY }
      );

      // Act
      const result = await compositeService.fetchMetadata(arxivUrl);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metadata = result.unwrap();
        expect(metadata.type).toBe(UrlType.RESEARCH); // Should be overridden by classifier
        expect(metadata.title).toBe('Research Paper'); // Other fields should remain
      }
    });

    it('should preserve metadata service type when URL classifier does not match', async () => {
      // Arrange
      const genericUrl = URL.create('https://example.com/article').unwrap();
      
      // Mock service returning specific type
      const iframelyMetadata = UrlMetadata.create({
        url: genericUrl.value,
        title: 'Generic Article',
        type: UrlType.ARTICLE,
      }).unwrap();
      
      const iframelyService = new MockIFramelyService(ok(iframelyMetadata));
      const citoidService = new MockCitoidService(err(new Error('Service failed')));
      
      const compositeService = new CompositeMetadataService(
        iframelyService,
        citoidService,
        { defaultService: DefaultServicePreference.IFRAMELY }
      );

      // Act
      const result = await compositeService.fetchMetadata(genericUrl);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metadata = result.unwrap();
        expect(metadata.type).toBe(UrlType.ARTICLE); // Should preserve original type
        expect(metadata.title).toBe('Generic Article');
      }
    });

    it('should apply URL classification to merged metadata from both services', async () => {
      // Arrange
      const githubUrl = URL.create('https://github.com/user/repo').unwrap();
      
      // Mock both services with different data
      const iframelyMetadata = UrlMetadata.create({
        url: githubUrl.value,
        title: 'GitHub Repository',
        type: UrlType.LINK, // Wrong type
        description: 'A great repository',
      }).unwrap();
      
      const citoidMetadata = UrlMetadata.create({
        url: githubUrl.value,
        title: 'GitHub Repository',
        type: UrlType.ARTICLE, // Also wrong type
        author: 'Developer Name',
      }).unwrap();
      
      const iframelyService = new MockIFramelyService(ok(iframelyMetadata));
      const citoidService = new MockCitoidService(ok(citoidMetadata));
      
      const compositeService = new CompositeMetadataService(
        iframelyService,
        citoidService,
        { defaultService: DefaultServicePreference.IFRAMELY }
      );

      // Act
      const result = await compositeService.fetchMetadata(githubUrl);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metadata = result.unwrap();
        expect(metadata.type).toBe(UrlType.SOFTWARE); // Should be overridden by classifier
        expect(metadata.title).toBe('GitHub Repository'); // Should preserve merged data
        expect(metadata.description).toBe('A great repository'); // From iframely
        expect(metadata.author).toBe('Developer Name'); // From citoid
      }
    });

    it('should handle URL classification when both services fail', async () => {
      // Arrange
      const youtubeUrl = URL.create('https://www.youtube.com/watch?v=test123').unwrap();
      
      const iframelyService = new MockIFramelyService(err(new Error('Iframely failed')));
      const citoidService = new MockCitoidService(err(new Error('Citoid failed')));
      
      const compositeService = new CompositeMetadataService(
        iframelyService,
        citoidService,
        { defaultService: DefaultServicePreference.IFRAMELY }
      );

      // Act
      const result = await compositeService.fetchMetadata(youtubeUrl);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Both metadata services failed');
      }
    });
  });

  describe('Service Selection Logic', () => {
    it('should prefer Iframely by default when both services succeed', async () => {
      // Arrange
      const testUrl = URL.create('https://example.com').unwrap();
      
      const iframelyMetadata = UrlMetadata.create({
        url: testUrl.value,
        title: 'Iframely Title',
        type: UrlType.ARTICLE,
      }).unwrap();
      
      const citoidMetadata = UrlMetadata.create({
        url: testUrl.value,
        title: 'Citoid Title',
        type: UrlType.LINK,
      }).unwrap();
      
      const iframelyService = new MockIFramelyService(ok(iframelyMetadata));
      const citoidService = new MockCitoidService(ok(citoidMetadata));
      
      const compositeService = new CompositeMetadataService(
        iframelyService,
        citoidService,
        { defaultService: DefaultServicePreference.IFRAMELY }
      );

      // Act
      const result = await compositeService.fetchMetadata(testUrl);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metadata = result.unwrap();
        expect(metadata.title).toBe('Iframely Title'); // Should use Iframely as primary
      }
    });

    it('should prefer Citoid when configured', async () => {
      // Arrange
      const testUrl = URL.create('https://example.com').unwrap();
      
      const iframelyMetadata = UrlMetadata.create({
        url: testUrl.value,
        title: 'Iframely Title',
        type: UrlType.ARTICLE,
      }).unwrap();
      
      const citoidMetadata = UrlMetadata.create({
        url: testUrl.value,
        title: 'Citoid Title',
        type: UrlType.LINK,
      }).unwrap();
      
      const iframelyService = new MockIFramelyService(ok(iframelyMetadata));
      const citoidService = new MockCitoidService(ok(citoidMetadata));
      
      const compositeService = new CompositeMetadataService(
        iframelyService,
        citoidService,
        { defaultService: DefaultServicePreference.CITOID }
      );

      // Act
      const result = await compositeService.fetchMetadata(testUrl);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metadata = result.unwrap();
        expect(metadata.title).toBe('Citoid Title'); // Should use Citoid as primary
      }
    });
  });

  describe('Configuration Methods', () => {
    it('should allow changing default service preference', () => {
      const iframelyService = new MockIFramelyService(ok({} as UrlMetadata));
      const citoidService = new MockCitoidService(ok({} as UrlMetadata));
      
      const compositeService = new CompositeMetadataService(
        iframelyService,
        citoidService,
        { defaultService: DefaultServicePreference.IFRAMELY }
      );

      expect(compositeService.getDefaultService()).toBe(DefaultServicePreference.IFRAMELY);
      
      compositeService.setDefaultService(DefaultServicePreference.CITOID);
      expect(compositeService.getDefaultService()).toBe(DefaultServicePreference.CITOID);
    });
  });
});
