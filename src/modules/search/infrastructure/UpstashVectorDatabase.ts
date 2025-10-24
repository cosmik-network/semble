import { Index } from '@upstash/vector';
import { Result, ok, err } from '../../../shared/core/Result';
import {
  IVectorDatabase,
  IndexUrlParams,
  FindSimilarUrlsParams,
  UrlSearchResult,
} from '../domain/IVectorDatabase';
import { UrlMetadataProps } from '../../cards/domain/value-objects/UrlMetadata';

interface UpstashMetadata extends UrlMetadataProps {
  [key: string]: any; // Add this index signature for additional flexibility
}

export class UpstashVectorDatabase implements IVectorDatabase {
  private index: Index<UpstashMetadata>;

  constructor(url: string, token: string) {
    this.index = new Index<UpstashMetadata>({
      url,
      token,
    });
  }

  async indexUrl(params: IndexUrlParams): Promise<Result<void>> {
    try {
      // Combine title and description for the data field
      const dataContent = [params.title, params.description]
        .filter(Boolean)
        .join(' ');

      await this.index.upsert({
        id: params.url,
        data: dataContent || params.url, // Fallback to URL if no content
        metadata: {
          url: params.url,
          title: params.title,
          description: params.description,
          author: params.author,
          publishedDate: params.publishedDate,
          siteName: params.siteName,
          imageUrl: params.imageUrl,
          type: params.type,
        },
      });
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
      // Get the query URL's content for comparison
      // We'll use the URL itself as the query data for now
      // In a more sophisticated implementation, we could fetch the indexed data
      const queryData = params.url;

      // Fetch top 100 results (naive pagination approach)
      const topK = Math.min(params.limit * 10, 100); // Get more results for pagination

      const queryResult = await this.index.query({
        data: queryData,
        topK,
        includeMetadata: true,
        includeVectors: false, // We don't need the vectors in the response
      });

      // Filter out the query URL itself and apply threshold
      const threshold = params.threshold || 0;
      const results: UrlSearchResult[] = [];

      for (const result of queryResult) {
        // Skip the query URL itself
        if (result.id === params.url) continue;

        // Apply threshold filter
        if (result.score < threshold) continue;

        results.push({
          url: result.id as string, // Cast to string since we use URLs as IDs
          similarity: result.score,
          metadata: {
            url: result.metadata?.url || (result.id as string),
            title: result.metadata?.title,
            description: result.metadata?.description,
            author: result.metadata?.author,
            publishedDate: result.metadata?.publishedDate,
            siteName: result.metadata?.siteName,
            imageUrl: result.metadata?.imageUrl,
            type: result.metadata?.type,
          },
        });
      }

      // Sort by similarity (highest first) and limit results
      results.sort((a, b) => b.similarity - a.similarity);
      const limitedResults = results.slice(0, params.limit);

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
      await this.index.delete(url);
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
    try {
      // Try to get index info as a health check
      await this.index.info();
      return ok(true);
    } catch (error) {
      return err(
        new Error(
          `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }
}
