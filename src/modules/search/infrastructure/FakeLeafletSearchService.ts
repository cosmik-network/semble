import { Result, ok } from '../../../shared/core/Result';
import { AppError } from '../../../shared/core/AppError';
import {
  ILeafletSearchService,
  LeafletDocumentResult,
  LeafletSearchResult,
} from '../domain/services/ILeafletSearchService';
import { UrlMetadata } from '../../cards/domain/value-objects/UrlMetadata';
import { UrlType } from '../../cards/domain/value-objects/UrlType';

export class FakeLeafletSearchService implements ILeafletSearchService {
  private readonly mockResults: Map<string, LeafletDocumentResult[]> =
    new Map();

  constructor() {
    // Pre-populate with some mock data
    this.setupMockData();
  }

  async searchLeafletDocsForUrl(
    targetUrl: string,
    limit?: number,
    cursor?: string,
  ): Promise<Result<LeafletSearchResult, AppError.UnexpectedError>> {
    // Simulate some processing time
    await new Promise((resolve) => setTimeout(resolve, 100));

    const results =
      this.mockResults.get(targetUrl) || this.generateMockResults(targetUrl);

    // Apply limit if specified
    const limitedResults = limit ? results.slice(0, limit) : results;

    // Simulate cursor for pagination (fake implementation)
    const nextCursor =
      limit && results.length > limit ? 'fake-cursor-next' : undefined;

    return ok({
      documents: limitedResults,
      cursor: nextCursor,
      total: results.length,
    });
  }

  private setupMockData(): void {
    // Mock results for common test URLs
    const exampleResults = this.createMockResults('https://example.com', [
      {
        title: 'Example Research Paper',
        author: 'Dr. Jane Smith',
        description: 'A comprehensive study on example topics',
        siteName: 'Example Journal',
        url: 'https://leaflet.example.com/research-paper-123',
      },
      {
        title: 'Another Example Document',
        author: 'Prof. John Doe',
        description: 'Further research building on previous work',
        siteName: 'Academic Leaflet',
        url: 'https://academic.leaflet.com/document-456',
      },
    ]);

    this.mockResults.set('https://example.com', exampleResults);

    // Mock results for science.org URL (commonly used in tests)
    const scienceResults = this.createMockResults(
      'https://www.science.org/doi/10.1126/science.adt7790',
      [
        {
          title: 'Commentary on Climate Research',
          author: 'Dr. Climate Researcher',
          description: 'Analysis of the latest climate science findings',
          siteName: 'Climate Leaflet',
          url: 'https://climate.leaflet.com/commentary-789',
        },
      ],
    );

    this.mockResults.set(
      'https://www.science.org/doi/10.1126/science.adt7790',
      scienceResults,
    );
  }

  private generateMockResults(targetUrl: string): LeafletDocumentResult[] {
    // Generate 1-3 random mock results for any URL
    const count = Math.floor(Math.random() * 3) + 1;
    const results: LeafletDocumentResult[] = [];

    for (let i = 0; i < count; i++) {
      const mockData = {
        title: `Mock Leaflet Document ${i + 1} for ${this.getDomainFromUrl(targetUrl)}`,
        author: `Mock Author ${i + 1}`,
        description: `This is a mock leaflet document that references ${targetUrl}`,
        siteName: `Mock Leaflet Site ${i + 1}`,
        url: `https://mock-leaflet-${i + 1}.example.com/doc-${Date.now()}-${i}`,
      };

      results.push(...this.createMockResults(targetUrl, [mockData]));
    }

    return results;
  }

  private createMockResults(
    targetUrl: string,
    mockData: Array<{
      title: string;
      author: string;
      description: string;
      siteName: string;
      url: string;
    }>,
  ): LeafletDocumentResult[] {
    return mockData.map((data) => {
      const metadataResult = UrlMetadata.create({
        url: data.url,
        title: data.title,
        author: data.author,
        description: data.description,
        siteName: data.siteName,
        type: UrlType.ARTICLE,
        publishedDate: new Date(
          Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000,
        ), // Random date within last year
        retrievedAt: new Date(),
      });

      if (metadataResult.isErr()) {
        throw new Error(
          `Failed to create mock metadata: ${metadataResult.error.message}`,
        );
      }

      return {
        url: data.url,
        metadata: metadataResult.value,
      };
    });
  }

  private getDomainFromUrl(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return 'unknown-domain';
    }
  }

  /**
   * Add custom mock results for testing
   */
  addMockResults(targetUrl: string, results: LeafletDocumentResult[]): void {
    this.mockResults.set(targetUrl, results);
  }

  /**
   * Clear all mock results
   */
  clearMockResults(): void {
    this.mockResults.clear();
    this.setupMockData();
  }
}
