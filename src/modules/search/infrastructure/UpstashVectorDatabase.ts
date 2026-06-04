import { Index } from '@upstash/vector';
import { Result, ok, err } from '../../../shared/core/Result';
import {
  IVectorDatabase,
  IndexUrlParams,
  SemanticSearchUrlsParams,
  UrlSearchResult,
} from '../domain/IVectorDatabase';
import {
  UrlMetadata,
  UrlMetadataProps,
} from '../../cards/domain/value-objects/UrlMetadata';
import { Chunk } from '../domain/value-objects/Chunk';
import { IEmbeddingService } from '../domain/services/IEmbeddingService';

interface UpstashMetadata extends UrlMetadataProps {
  [key: string]: any; // Add this index signature for additional flexibility
}

export class UpstashVectorDatabase implements IVectorDatabase {
  private index: Index<UpstashMetadata>;
  private embeddingService?: IEmbeddingService;

  constructor(
    url: string,
    token: string,
    embeddingService?: IEmbeddingService,
  ) {
    this.index = new Index<UpstashMetadata>({
      url,
      token,
    });
    this.embeddingService = embeddingService;
  }

  async indexUrl(params: IndexUrlParams): Promise<Result<void>> {
    try {
      // Use Chunk to create the data content
      const metadataResult = UrlMetadata.create(params);
      if (metadataResult.isErr()) {
        return err(
          new Error(`Invalid metadata: ${metadataResult.error.message}`),
        );
      }
      const chunk = Chunk.create(metadataResult.value);
      const content = chunk.value || params.url;

      const metadata: UpstashMetadata = {
        url: params.url,
        title: params.title,
        description: params.description,
        author: params.author,
        publishedDate: params.publishedDate,
        siteName: params.siteName,
        imageUrl: params.imageUrl,
        type: params.type,
      };

      try {
        await this.index.upsert({
          id: params.url,
          data: content,
          metadata,
        });
        return ok(undefined);
      } catch (upsertError) {
        if (this.embeddingService && this.isEmbeddingError(upsertError)) {
          console.log(
            `[UpstashVectorDatabase] Upstash embedding failed for URL ${params.url}, falling back to embedding service: ${this.errorMessage(
              upsertError,
            )}`,
          );
          const embedResult = await this.embeddingService.embed(content);
          if (embedResult.isErr()) {
            return err(
              new Error(
                `[UpstashVectorDatabase] Failed to index URL: Upstash embedding failed (${this.errorMessage(upsertError)}) and HuggingFace fallback failed (${embedResult.error.message})`,
              ),
            );
          }

          await this.index.upsert({
            id: params.url,
            vector: embedResult.value,
            metadata,
          });
          return ok(undefined);
        }
        throw upsertError;
      }
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
      // Fetch top 100 results (naive pagination approach)
      const topK = Math.min(params.limit * 10, 100); // Get more results for pagination
      const filter = params.urlType ? `type = '${params.urlType}'` : undefined;

      let queryResult;
      try {
        queryResult = await this.index.query({
          data: params.query,
          topK,
          includeMetadata: true,
          includeVectors: false, // We don't need the vectors in the response
          filter,
        });
      } catch (queryError) {
        if (this.embeddingService && this.isEmbeddingError(queryError)) {
          console.log(
            `[UpstashVectorDatabase] Upstash embedding failed for search query, falling back to embedding service: ${this.errorMessage(
              queryError,
            )}`,
          );
          const embedResult = await this.embeddingService.embed(params.query);
          if (embedResult.isErr()) {
            return err(
              new Error(
                `[UpstashVectorDatabase] Failed to search URLs: Upstash embedding failed (${this.errorMessage(queryError)}) and HuggingFace fallback failed (${embedResult.error.message})`,
              ),
            );
          }

          queryResult = await this.index.query({
            vector: embedResult.value,
            topK,
            includeMetadata: true,
            includeVectors: false,
            filter,
          });
        } else {
          throw queryError;
        }
      }

      // Apply threshold filter
      const threshold = params.threshold || 0.3;
      const results: UrlSearchResult[] = [];

      for (const result of queryResult) {
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
          `Failed to search URLs: ${error instanceof Error ? error.message : 'Unknown error'}`,
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

  private isEmbeddingError(error: unknown): boolean {
    const message = this.errorMessage(error).toLowerCase();
    return (
      message.includes('embedding generation failed') ||
      message.includes('unavailable')
    );
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
