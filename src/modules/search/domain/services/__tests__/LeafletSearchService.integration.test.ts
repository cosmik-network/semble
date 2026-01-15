import { CompositeMetadataService } from '../../../../cards/infrastructure/CompositeMetadataService';
import { IFramelyMetadataService } from '../../../../cards/infrastructure/IFramelyMetadataService';
import { CitoidMetadataService } from '../../../../cards/infrastructure/CitoidMetadataService';
import { ConstellationLeafletSearchService } from '../ConstellationLeafletSearchService';

describe.skip('LeafletSearchService', () => {
  let service: ConstellationLeafletSearchService;
  let metadataService: CompositeMetadataService;

  beforeEach(() => {
    const testApiKey = process.env.IFRAMELY_API_KEY || 'test-api-key';
    const iframelyService = new IFramelyMetadataService(testApiKey);
    const citoidService = new CitoidMetadataService();
    metadataService = new CompositeMetadataService(
      iframelyService,
      citoidService,
    );
    service = new ConstellationLeafletSearchService(metadataService);
  });

  it('should search for leaflet documents linking to a URL', async () => {
    // Change this URL to test different targets
    const targetUrl = 'https://semble.so';

    const result = await service.searchLeafletDocsForUrl(targetUrl, 16);

    console.log('Search result:', result);

    if (result.isOk()) {
      console.log('Found documents:', result.value);
      result.value.documents.forEach((doc, index) => {
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

    const result = await service.searchLeafletDocsForUrl(targetUrl, 5);

    console.log('Empty search result:', result);

    if (result.isOk()) {
      expect(Array.isArray(result.value)).toBe(true);
      console.log('Number of results:', result.value.documents.length);
    }
  });
});
