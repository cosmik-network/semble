import { Index } from '@upstash/vector';
import { Result, ok, err } from '../../../shared/core/Result';
import {
  IVectorDatabase,
  IndexUrlParams,
  IndexAnnotationParams,
  SemanticSearchUrlsParams,
  SemanticSearchCardsParams,
  CardSearchResult,
  UrlSearchResult,
} from '../domain/IVectorDatabase';
import {
  UrlMetadata,
  UrlMetadataProps,
} from '../../cards/domain/value-objects/UrlMetadata';
import { Chunk } from '../domain/value-objects/Chunk';
import { IEmbeddingService } from '../domain/services/IEmbeddingService';
import { annotationVectorId } from '../domain/value-objects/AnnotationVectorId';
import { CardTypeEnum } from '../../cards/domain/value-objects/CardType';
import { UrlType } from '../../cards/domain/value-objects/UrlType';

interface UpstashMetadata extends UrlMetadataProps {
  [key: string]: any; // Add this index signature for additional flexibility
}

// Blended results cap: how many hits (URL card + annotations counted together)
// a single URL can contribute, so one page-match query can't be dominated by
// that page's own annotations
const MAX_HITS_PER_URL = 2;

export class UpstashVectorDatabase implements IVectorDatabase {
  private index: Index<UpstashMetadata>;
  // Annotation passage vectors live in a separate namespace of the same index.
  // URL vectors stay in the (default) base index — routing them through a named
  // namespace would orphan every existing vector.
  private annotationsIndex: ReturnType<Index<UpstashMetadata>['namespace']>;
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
    this.annotationsIndex = this.index.namespace('annotations');
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

      return await this.upsertWithFallback(
        (embedded) =>
          this.index.upsert(
            embedded
              ? { id: params.url, vector: embedded, metadata }
              : { id: params.url, data: content, metadata },
          ),
        content,
        `URL ${params.url}`,
      );
    } catch (error) {
      return err(
        new Error(
          `Failed to index URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }

  async indexAnnotation(params: IndexAnnotationParams): Promise<Result<void>> {
    try {
      const id = annotationVectorId(params.url, params.exactNormalized);
      // Metadata is a pointer back to Postgres, not a copy of card state —
      // everything else (author, note, counts) is resolved from the
      // (url, exactNormalized) pair at query time.
      const metadata = {
        url: params.url,
        exactNormalized: params.exactNormalized,
        ...(params.urlType ? { urlType: params.urlType } : {}),
      };

      return await this.upsertWithFallback(
        (embedded) =>
          this.annotationsIndex.upsert(
            embedded
              ? { id, vector: embedded, metadata }
              : { id, data: params.passage, metadata },
          ),
        params.passage,
        `annotation ${id}`,
      );
    } catch (error) {
      return err(
        new Error(
          `Failed to index annotation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }

  async semanticSearchUrls(
    params: SemanticSearchUrlsParams,
  ): Promise<Result<UrlSearchResult[]>> {
    const cardsResult = await this.semanticSearchCards({
      ...params,
      cardType: CardTypeEnum.URL,
    });
    if (cardsResult.isErr()) {
      return err(
        new Error(`Failed to search URLs: ${cardsResult.error.message}`),
      );
    }
    return ok(
      cardsResult.value
        .filter(
          (
            result,
          ): result is Extract<
            CardSearchResult,
            { cardType: typeof CardTypeEnum.URL }
          > => result.cardType === CardTypeEnum.URL,
        )
        .map(({ url, similarity, metadata }) => ({
          url,
          similarity,
          metadata,
        })),
    );
  }

  async semanticSearchCards(
    params: SemanticSearchCardsParams,
  ): Promise<Result<CardSearchResult[]>> {
    try {
      // Callers can widen the net with topK; Upstash caps topK at 1000
      const topK = params.topK
        ? Math.min(params.topK, 1000)
        : Math.min(params.limit * 10, 100);
      const threshold = params.threshold || 0.3;

      // cardType routes the query to namespaces — it is never a metadata filter
      const queryUrls = params.cardType !== CardTypeEnum.ANNOTATION;
      const queryAnnotations = params.cardType !== CardTypeEnum.URL;

      const urlResults: CardSearchResult[] = [];
      const annotationResults: CardSearchResult[] = [];

      if (queryUrls) {
        const filter = params.urlType
          ? `type = '${params.urlType}'`
          : undefined;
        const queryResult = await this.queryWithFallback(
          (embedded) =>
            this.index.query({
              ...(embedded ? { vector: embedded } : { data: params.query }),
              topK,
              includeMetadata: true,
              includeVectors: false, // We don't need the vectors in the response
              filter,
            }),
          params.query,
        );
        if (queryResult.isErr()) {
          return err(
            new Error(`Failed to search URLs: ${queryResult.error.message}`),
          );
        }
        for (const result of queryResult.value) {
          if (result.score < threshold) continue;
          urlResults.push({
            cardType: CardTypeEnum.URL,
            url: result.id as string, // URLs are used as IDs in the base index
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
      }

      if (queryAnnotations) {
        const filter = params.urlType
          ? `urlType = '${params.urlType}'`
          : undefined;
        const queryResult = await this.queryWithFallback(
          (embedded) =>
            this.annotationsIndex.query({
              ...(embedded ? { vector: embedded } : { data: params.query }),
              topK,
              includeMetadata: true,
              includeVectors: false,
              filter,
            }),
          params.query,
        );
        if (queryResult.isErr()) {
          return err(
            new Error(
              `Failed to search annotations: ${queryResult.error.message}`,
            ),
          );
        }
        for (const result of queryResult.value) {
          if (result.score < threshold) continue;
          const metadata = result.metadata as
            | { url?: string; exactNormalized?: string; urlType?: string }
            | undefined;
          if (!metadata?.url || !metadata.exactNormalized) {
            continue; // Unresolvable record — skip rather than guess
          }
          annotationResults.push({
            cardType: CardTypeEnum.ANNOTATION,
            url: metadata.url,
            exactNormalized: metadata.exactNormalized,
            similarity: result.score,
            urlType: metadata.urlType as UrlType | undefined,
          });
        }
      }

      // Both namespaces share one embedding model, so raw cosine scores are
      // on the same scale and can be merged by score. RRF is the documented
      // fallback if the distributions prove incomparable in practice.
      const merged = this.mergeCardResults(
        [...urlResults, ...annotationResults],
        params.limit,
      );

      return ok(merged);
    } catch (error) {
      return err(
        new Error(
          `Failed to search cards: ${error instanceof Error ? error.message : 'Unknown error'}`,
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

  async deleteAnnotation(
    url: string,
    exactNormalized: string,
  ): Promise<Result<void>> {
    try {
      await this.annotationsIndex.delete(
        annotationVectorId(url, exactNormalized),
      );
      return ok(undefined);
    } catch (error) {
      return err(
        new Error(
          `Failed to delete annotation: ${error instanceof Error ? error.message : 'Unknown error'}`,
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

  /**
   * Merge results from both namespaces: sort by similarity, cap hits per URL
   * (counted across both card types), then limit.
   */
  private mergeCardResults(
    results: CardSearchResult[],
    limit: number,
  ): CardSearchResult[] {
    const perUrlCount = new Map<string, number>();
    return results
      .sort((a, b) => b.similarity - a.similarity)
      .filter((result) => {
        const count = (perUrlCount.get(result.url) ?? 0) + 1;
        perUrlCount.set(result.url, count);
        return count <= MAX_HITS_PER_URL;
      })
      .slice(0, limit);
  }

  /**
   * Upsert raw text, retrying with an explicit embedding if Upstash's own
   * embedding generation fails. Shared by both namespaces.
   */
  private async upsertWithFallback(
    doUpsert: (embedded?: number[]) => Promise<unknown>,
    content: string,
    label: string,
  ): Promise<Result<void>> {
    try {
      await doUpsert();
      return ok(undefined);
    } catch (upsertError) {
      if (this.embeddingService && this.isEmbeddingError(upsertError)) {
        console.log(
          `[UpstashVectorDatabase] Upstash embedding failed for ${label}, falling back to embedding service: ${this.errorMessage(
            upsertError,
          )}`,
        );
        const embedResult = await this.embeddingService.embed(content);
        if (embedResult.isErr()) {
          return err(
            new Error(
              `[UpstashVectorDatabase] Failed to index ${label}: Upstash embedding failed (${this.errorMessage(upsertError)}) and HuggingFace fallback failed (${embedResult.error.message})`,
            ),
          );
        }

        await doUpsert(embedResult.value);
        return ok(undefined);
      }
      return err(
        new Error(
          `Failed to index ${label}: ${this.errorMessage(upsertError)}`,
        ),
      );
    }
  }

  /**
   * Query with raw text, retrying with an explicit embedding if Upstash's own
   * embedding generation fails. Shared by both namespaces.
   */
  private async queryWithFallback<T>(
    doQuery: (embedded?: number[]) => Promise<T>,
    queryText: string,
  ): Promise<Result<T>> {
    try {
      return ok(await doQuery());
    } catch (queryError) {
      if (this.embeddingService && this.isEmbeddingError(queryError)) {
        console.log(
          `[UpstashVectorDatabase] Upstash embedding failed for search query, falling back to embedding service: ${this.errorMessage(
            queryError,
          )}`,
        );
        const embedResult = await this.embeddingService.embed(queryText);
        if (embedResult.isErr()) {
          return err(
            new Error(
              `[UpstashVectorDatabase] Failed to search: Upstash embedding failed (${this.errorMessage(queryError)}) and HuggingFace fallback failed (${embedResult.error.message})`,
            ),
          );
        }

        return ok(await doQuery(embedResult.value));
      }
      return err(new Error(this.errorMessage(queryError)));
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
