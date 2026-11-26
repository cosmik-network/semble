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
import { UrlMetadataProps } from '../../cards/domain/value-objects/UrlMetadata';
import { annotationVectorId } from '../domain/value-objects/AnnotationVectorId';
import { CardTypeEnum } from '../../cards/domain/value-objects/CardType';
import { UrlType } from '../../cards/domain/value-objects/UrlType';

interface IndexedUrl {
  url: string;
  content: string;
  metadata: UrlMetadataProps;
  indexedAt: Date;
}

interface IndexedAnnotation {
  url: string;
  exactNormalized: string;
  passage: string;
  urlType?: string;
  indexedAt: Date;
}

// Mirrors UpstashVectorDatabase.MAX_HITS_PER_URL
const MAX_HITS_PER_URL = 2;

export class InMemoryVectorDatabase implements IVectorDatabase {
  private static instance: InMemoryVectorDatabase;
  private urls: Map<string, IndexedUrl> = new Map();
  private annotations: Map<string, IndexedAnnotation> = new Map();

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

  async indexAnnotation(params: IndexAnnotationParams): Promise<Result<void>> {
    try {
      const id = annotationVectorId(params.url, params.exactNormalized);
      this.annotations.set(id, {
        url: params.url,
        exactNormalized: params.exactNormalized,
        passage: params.passage,
        urlType: params.urlType,
        indexedAt: new Date(),
      });
      return ok(undefined);
    } catch (error) {
      return err(
        new Error(
          `Failed to index annotation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }

  async semanticSearchCards(
    params: SemanticSearchCardsParams,
  ): Promise<Result<CardSearchResult[]>> {
    try {
      const queryTerms = this.extractSearchTerms(params.query);
      const threshold = params.threshold || 0.3;
      const results: CardSearchResult[] = [];

      // cardType routes the query to namespaces — it is never a metadata filter
      if (params.cardType !== CardTypeEnum.ANNOTATION) {
        for (const indexed of this.urls.values()) {
          if (params.urlType && indexed.metadata.type !== params.urlType) {
            continue;
          }

          const matchScore = this.calculateTextMatch(
            queryTerms,
            indexed.content,
          );
          if (matchScore >= threshold) {
            results.push({
              cardType: CardTypeEnum.URL,
              url: indexed.url,
              similarity: matchScore,
              metadata: indexed.metadata,
            });
          }
        }
      }

      if (params.cardType !== CardTypeEnum.URL) {
        for (const indexed of this.annotations.values()) {
          if (params.urlType && indexed.urlType !== params.urlType) {
            continue;
          }

          const matchScore = this.calculateTextMatch(
            queryTerms,
            indexed.passage,
          );
          if (matchScore >= threshold) {
            results.push({
              cardType: CardTypeEnum.ANNOTATION,
              url: indexed.url,
              exactNormalized: indexed.exactNormalized,
              similarity: matchScore,
              urlType: indexed.urlType as UrlType | undefined,
            });
          }
        }
      }

      // Same merge semantics as UpstashVectorDatabase: sort by similarity,
      // cap hits per URL across both card types, then limit.
      const perUrlCount = new Map<string, number>();
      const merged = results
        .sort((a, b) => b.similarity - a.similarity)
        .filter((result) => {
          const count = (perUrlCount.get(result.url) ?? 0) + 1;
          perUrlCount.set(result.url, count);
          return count <= MAX_HITS_PER_URL;
        })
        .slice(0, params.limit);

      return ok(merged);
    } catch (error) {
      return err(
        new Error(
          `Failed to search cards: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }

  async deleteAnnotation(
    url: string,
    exactNormalized: string,
  ): Promise<Result<void>> {
    try {
      this.annotations.delete(annotationVectorId(url, exactNormalized));
      return ok(undefined);
    } catch (error) {
      return err(
        new Error(
          `Failed to delete annotation: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
   * Clear all indexed URLs and annotations (useful for testing)
   */
  clear(): void {
    this.urls.clear();
    this.annotations.clear();
  }

  /**
   * Get count of indexed URLs (useful for testing/monitoring)
   */
  getIndexedUrlCount(): number {
    return this.urls.size;
  }

  /**
   * Get count of indexed annotations (useful for testing/monitoring)
   */
  getIndexedAnnotationCount(): number {
    return this.annotations.size;
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
