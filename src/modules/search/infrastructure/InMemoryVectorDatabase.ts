import { Result, ok, err } from '../../../shared/core/Result';
import {
  IVectorDatabase,
  IndexUrlParams,
  SemanticSearchUrlsParams,
  UrlSearchResult,
} from '../domain/IVectorDatabase';
import { UrlMetadataProps } from '../../cards/domain/value-objects/UrlMetadata';

interface IndexedUrl {
  url: string;
  content: string;
  metadata: UrlMetadataProps;
  indexedAt: Date;
}

export class InMemoryVectorDatabase implements IVectorDatabase {
  private static instance: InMemoryVectorDatabase;
  private urls: Map<string, IndexedUrl> = new Map();

  private constructor() {}

  public static getInstance(): InMemoryVectorDatabase {
    if (!InMemoryVectorDatabase.instance) {
      InMemoryVectorDatabase.instance = new InMemoryVectorDatabase();
    }
    return InMemoryVectorDatabase.instance;
  }

  async indexUrl(params: IndexUrlParams): Promise<Result<void>> {
    try {
      console.log('Indexing URL in InMemoryVectorDatabase:', params.url);

      // Prepare content for embedding (combine title, description, author, siteName)
      const content = this.prepareContentForEmbedding(
        params.title,
        params.description,
        params.author,
        params.siteName,
      );

      this.urls.set(params.url, {
        url: params.url,
        content: content,
        metadata: {
          url: params.url,
          title: params.title,
          description: params.description,
          author: params.author,
          publishedDate: params.publishedDate,
          siteName: params.siteName,
          imageUrl: params.imageUrl,
          type: params.type,
          retrievedAt: params.retrievedAt,
        },
        indexedAt: new Date(),
      });
      console.log('Current indexed URLs:', Array.from(this.urls.keys()));

      return ok(undefined);
    } catch (error) {
      return err(
        new Error(
          `Failed to index URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }

  async semanticSearchUrls(
    params: SemanticSearchUrlsParams,
  ): Promise<Result<UrlSearchResult[]>> {
    try {
      console.log('Searching through', this.urls.size, 'indexed URLs');
      const results: UrlSearchResult[] = [];
      const queryTerms = this.extractSearchTerms(params.query);

      console.log('Search terms:', queryTerms);

      for (const [url, indexed] of this.urls.entries()) {
        // Filter by URL type if specified
        if (params.urlType && indexed.metadata.type !== params.urlType) {
          continue;
        }

        const matchScore = this.calculateTextMatch(queryTerms, indexed.content);

        console.log(`Match score for "${indexed.content}": ${matchScore}`);

        // Include result if any search terms match
        if (matchScore > 0) {
          results.push({
            url: indexed.url,
            similarity: matchScore, // Use match score as similarity
            metadata: indexed.metadata,
          });
        }
      }

      // Sort by match score (highest first) and limit results
      results.sort((a, b) => b.similarity - a.similarity);
      const limitedResults = results.slice(0, params.limit);

      console.log(`Found ${limitedResults.length} matching URLs`);

      return ok(limitedResults);
    } catch (error) {
      return err(
        new Error(
          `Failed to search URLs: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }

  async deleteUrl(url: string): Promise<Result<void>> {
    try {
      this.urls.delete(url);
      return ok(undefined);
    } catch (error) {
      return err(
        new Error(
          `Failed to delete URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }

  async healthCheck(): Promise<Result<boolean>> {
    return ok(true);
  }

  /**
   * Extract search terms from query string
   */
  private extractSearchTerms(query: string): string[] {
    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((term) => term.length > 0);
  }

  /**
   * Calculate text match score based on how many search terms are found
   * Returns a score from 0 to 1 based on the percentage of terms that match
   */
  private calculateTextMatch(searchTerms: string[], content: string): number {
    if (searchTerms.length === 0) return 0;

    const contentLower = content.toLowerCase();
    let matchedTerms = 0;

    for (const term of searchTerms) {
      // Check for exact word match or partial match
      if (contentLower.includes(term)) {
        matchedTerms++;
      }
    }

    // Return percentage of terms that matched
    return matchedTerms / searchTerms.length;
  }

  /**
   * Clear all indexed URLs (useful for testing)
   */
  clear(): void {
    this.urls.clear();
  }

  /**
   * Get count of indexed URLs (useful for testing/monitoring)
   */
  getIndexedUrlCount(): number {
    return this.urls.size;
  }

  /**
   * Prepare content for embedding (combine title, description, author, siteName)
   */
  private prepareContentForEmbedding(
    title?: string,
    description?: string,
    author?: string,
    siteName?: string,
  ): string {
    const parts: string[] = [];

    if (title) parts.push(title);
    if (description) parts.push(description);
    if (author) parts.push(`by ${author}`);
    if (siteName) parts.push(`from ${siteName}`);

    return parts.join(' ');
  }
}
