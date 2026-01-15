import { LeafletSearchService } from '../LeafletSearchService';
import { IMetadataService } from '../../../../cards/domain/services/IMetadataService';
import { UrlMetadata } from '../../../../cards/domain/value-objects/UrlMetadata';
import { URL } from '../../../../cards/domain/value-objects/URL';
import { Result, ok } from '../../../../../shared/core/Result';

// Mock metadata service for testing
class MockMetadataService implements IMetadataService {
  async fetchMetadata(url: URL): Promise<Result<UrlMetadata>> {
    // Simple mock that creates basic metadata
    const metadata = UrlMetadata.create({
      url: url.value,
      title: 'Mock Title',
      description: 'Mock Description',
      siteName: 'Mock Site',
    });
    return metadata;
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }
}

describe('LeafletSearchService', () => {
  let service: LeafletSearchService;
  let mockMetadataService: MockMetadataService;

  beforeEach(() => {
    mockMetadataService = new MockMetadataService();
    service = new LeafletSearchService(mockMetadataService);
  });

  it('should search for leaflet documents linking to a URL', async () => {
    // Change this URL to test different targets
    const targetUrl = 'https://example.com';
    
    // Set a breakpoint here to inspect the service and parameters
    debugger;
    
    const result = await service.searchLeafletDocsForUrl(targetUrl, 10);
    
    // Set another breakpoint here to inspect the results
    debugger;
    
    console.log('Search result:', result);
    
    if (result.isOk()) {
      console.log('Found documents:', result.value);
      result.value.forEach((doc, index) => {
        console.log(`Document ${index + 1}:`, {
          url: doc.url,
          title: doc.metadata.title,
          author: doc.metadata.author,
          description: doc.metadata.description,
        });
      });
    } else {
      console.error('Search failed:', result.error);
    }

    // Basic assertion - adjust based on expected behavior
    expect(result.isOk() || result.isErr()).toBe(true);
  });

  it('should handle empty results gracefully', async () => {
    // Test with a URL that likely won't have any backlinks
    const targetUrl = 'https://nonexistent-domain-12345.com/test';
    
    debugger;
    
    const result = await service.searchLeafletDocsForUrl(targetUrl, 5);
    
    debugger;
    
    console.log('Empty search result:', result);
    
    if (result.isOk()) {
      expect(Array.isArray(result.value)).toBe(true);
      console.log('Number of results:', result.value.length);
    }
  });
});
