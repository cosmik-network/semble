import { Result, ok, err } from '../../../shared/core/Result';
import {
  IVectorDatabase,
  IndexUrlParams,
  FindSimilarUrlsParams,
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

  async findSimilarUrls(
    params: FindSimilarUrlsParams,
  ): Promise<Result<UrlSearchResult[]>> {
    try {
      console.log('all urls to compare', this.urls);
      const threshold = params.threshold || 0; // Lower default threshold for more matches
      const results: UrlSearchResult[] = [];

      // Get the query URL's content for comparison
      const queryUrl = this.urls.get(params.url);
      const queryContent = queryUrl?.content || params.url;

      console.log('Query content for similarity:', queryContent);

      for (const [url, indexed] of this.urls.entries()) {
        // Skip the query URL itself
        if (url === params.url) continue;

        // Filter by URL type if specified
        if (params.urlType && indexed.metadata.type !== params.urlType) {
          continue;
        }

        const similarity = this.calculateSimilarity(
          queryContent,
          indexed.content,
        );

        console.log(
          `Similarity between "${queryContent}" and "${indexed.content}": ${similarity}`,
        );

        if (similarity >= threshold) {
          results.push({
            url: indexed.url,
            similarity,
            metadata: indexed.metadata,
          });
        }
      }

      // Sort by similarity (highest first) and limit results
      results.sort((a, b) => b.similarity - a.similarity);
      const limitedResults = results.slice(0, params.limit);

      console.log(
        `Found ${limitedResults.length} similar URLs above threshold ${threshold}`,
      );

      return ok(limitedResults);
    } catch (error) {
      return err(
        new Error(
          `Failed to find similar URLs: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
   * Simple text similarity calculation based on shared words
   * Uses a more lenient scoring system to increase likelihood of matches
   */
  private calculateSimilarity(text1: string, text2: string): number {
    const words1 = this.tokenize(text1);
    const words2 = this.tokenize(text2);

    if (words1.length === 0 && words2.length === 0) return 1;
    if (words1.length === 0 || words2.length === 0) return 0;

    // Count shared words (with frequency)
    const freq1 = this.getWordFrequency(words1);
    const freq2 = this.getWordFrequency(words2);

    let sharedWords = 0;
    let totalWords = 0;

    // Count shared words based on minimum frequency
    for (const word of new Set([...words1, ...words2])) {
      const count1 = freq1.get(word) || 0;
      const count2 = freq2.get(word) || 0;

      if (count1 > 0 && count2 > 0) {
        sharedWords += Math.min(count1, count2);
      }
      totalWords += Math.max(count1, count2);
    }

    // Return ratio of shared words to total words
    // This is more lenient than Jaccard similarity
    return totalWords > 0 ? sharedWords / totalWords : 0;
  }

  /**
   * Get word frequency map
   */
  private getWordFrequency(words: string[]): Map<string, number> {
    const freq = new Map<string, number>();
    for (const word of words) {
      freq.set(word, (freq.get(word) || 0) + 1);
    }
    return freq;
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 1); // Allow shorter words for more matches
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
