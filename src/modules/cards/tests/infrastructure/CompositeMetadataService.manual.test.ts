import { CompositeMetadataService } from '../../infrastructure/CompositeMetadataService';
import { IFramelyMetadataService } from '../../infrastructure/IFramelyMetadataService';
import { CitoidMetadataService } from '../../infrastructure/CitoidMetadataService';
import { URL } from '../../domain/value-objects/URL';

describe('CompositeMetadataService Manual Tests', () => {
  let service: CompositeMetadataService;
  const testApiKey = process.env.IFRAMELY_API_KEY || 'test-api-key';

  beforeEach(() => {
    const iframelyService = new IFramelyMetadataService(testApiKey);
    const citoidService = new CitoidMetadataService();
    service = new CompositeMetadataService(iframelyService, citoidService);
  });

  it('should fetch metadata for manual URL testing', async () => {
    // CHANGE THIS URL TO TEST DIFFERENT LINKS
    const testUrl = 'https://arxiv.org/abs/2502.10834';
    
    console.log(`\n🔍 Testing URL: ${testUrl}`);
    console.log('=' .repeat(60));

    const urlResult = URL.create(testUrl);
    expect(urlResult.isOk()).toBe(true);
    const url = urlResult.unwrap();

    // Test the composite service
    const result = await service.fetchMetadata(url);

    if (result.isOk()) {
      const metadata = result.unwrap();
      
      console.log('✅ SUCCESS - Metadata fetched:');
      console.log({
        url: metadata.url,
        title: metadata.title,
        description: metadata.description?.substring(0, 100) + (metadata.description?.length > 100 ? '...' : ''),
        author: metadata.author,
        type: metadata.type,
        siteName: metadata.siteName,
        imageUrl: metadata.imageUrl,
        publishedDate: metadata.publishedDate?.toISOString(),
        doi: metadata.doi,
        isbn: metadata.isbn,
        retrievedAt: metadata.retrievedAt?.toISOString(),
      });
    } else {
      console.log('❌ FAILED - Error:', result.error.message);
    }

    // Also test individual services for comparison
    console.log('\n🔍 Individual service results:');
    console.log('-'.repeat(40));

    try {
      const iframelyResult = await service.fetchFromIframely(url);
      if (iframelyResult.isOk()) {
        const iframelyMetadata = iframelyResult.unwrap();
        console.log('📱 Iframely type:', iframelyMetadata.type);
        console.log('📱 Iframely title:', iframelyMetadata.title);
      } else {
        console.log('📱 Iframely failed:', iframelyResult.error.message);
      }
    } catch (error) {
      console.log('📱 Iframely error:', error);
    }

    try {
      const citoidResult = await service.fetchFromCitoid(url);
      if (citoidResult.isOk()) {
        const citoidMetadata = citoidResult.unwrap();
        console.log('📚 Citoid type:', citoidMetadata.type);
        console.log('📚 Citoid title:', citoidMetadata.title);
      } else {
        console.log('📚 Citoid failed:', citoidResult.error.message);
      }
    } catch (error) {
      console.log('📚 Citoid error:', error);
    }

    console.log('\n' + '='.repeat(60));

    // Always pass the test - this is just for manual debugging
    expect(true).toBe(true);
  }, 30000); // 30 second timeout
});
