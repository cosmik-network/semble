import { UrlType } from 'src/modules/cards/domain/value-objects/UrlType';
import { CardTypeEnum } from '../../cards/domain/value-objects/CardType';
import { Result } from '../../../shared/core/Result';
import { UrlMetadataProps } from '../../cards/domain/value-objects/UrlMetadata';

export type IndexUrlParams = UrlMetadataProps;

export interface SemanticSearchUrlsParams {
  query: string;
  limit: number;
  threshold?: number; // Similarity threshold (0-1)
  urlType?: UrlType; // Optional URL type to filter results
  topK?: number; // How many candidates to fetch from the index before filtering/limiting (defaults to an implementation-specific value derived from limit)
}

export interface UrlSearchResult {
  url: string;
  similarity: number;
  metadata: UrlMetadataProps;
}

export interface IndexAnnotationParams {
  url: string;
  /** The stored annotation_selectors.exact_normalized value — the ID hash input */
  exactNormalized: string;
  /** The raw selector.exact — the only embedded content */
  passage: string;
  /** Resolved from URL cards at index time; omitted when unknown */
  urlType?: UrlType;
}

export interface SemanticSearchCardsParams {
  query: string;
  limit: number;
  threshold?: number; // Similarity threshold (0-1)
  urlType?: UrlType; // Optional URL type to filter results (metadata filter inside each namespace)
  cardType?: CardTypeEnum; // ROUTING parameter — which namespaces to query, never a metadata filter
  topK?: number; // How many candidates to fetch per namespace before filtering/limiting
}

export type CardSearchResult =
  | {
      cardType: typeof CardTypeEnum.URL;
      url: string;
      similarity: number;
      metadata: UrlMetadataProps;
    }
  | {
      cardType: typeof CardTypeEnum.ANNOTATION;
      url: string;
      exactNormalized: string;
      similarity: number;
      urlType?: UrlType;
    };

export interface IVectorDatabase {
  /**
   * Index a URL with its metadata for similarity search
   */
  indexUrl(params: IndexUrlParams): Promise<Result<void>>;

  /**
   * Find URLs similar to the given query string
   */
  semanticSearchUrls(
    params: SemanticSearchUrlsParams,
  ): Promise<Result<UrlSearchResult[]>>;

  /**
   * Remove a URL from the search index
   */
  deleteUrl(url: string): Promise<Result<void>>;

  /**
   * Index an annotation passage. Idempotent — a second user highlighting the
   * same passage on the same URL upserts the same vector ID.
   */
  indexAnnotation(params: IndexAnnotationParams): Promise<Result<void>>;

  /**
   * Remove an annotation passage vector from the index. Callers must first
   * verify no other annotation card shares the passage.
   */
  deleteAnnotation(url: string, exactNormalized: string): Promise<Result<void>>;

  /**
   * Search across card types. `cardType` routes the query to the URL index,
   * the annotation namespace, or both (parallel query + merged results).
   */
  semanticSearchCards(
    params: SemanticSearchCardsParams,
  ): Promise<Result<CardSearchResult[]>>;

  /**
   * Check if the vector database is healthy/connected
   */
  healthCheck(): Promise<Result<boolean>>;
}
