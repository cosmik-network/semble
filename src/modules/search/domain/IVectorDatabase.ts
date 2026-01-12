import { UrlType } from 'src/modules/cards/domain/value-objects/UrlType';
import { Result } from '../../../shared/core/Result';
import { UrlMetadataProps } from '../../cards/domain/value-objects/UrlMetadata';

export type IndexUrlParams = UrlMetadataProps;


export interface SemanticSearchUrlsParams {
  query: string;
  limit: number;
  threshold?: number; // Similarity threshold (0-1)
  urlType?: UrlType; // Optional URL type to filter results
}

export interface UrlSearchResult {
  url: string;
  similarity: number;
  metadata: UrlMetadataProps;
}

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
   * Check if the vector database is healthy/connected
   */
  healthCheck(): Promise<Result<boolean>>;
}
