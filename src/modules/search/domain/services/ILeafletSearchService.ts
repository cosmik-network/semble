import { Result } from '../../../../shared/core/Result';
import { AppError } from '../../../../shared/core/AppError';
import { UrlMetadata } from '../../../cards/domain/value-objects/UrlMetadata';

export interface LeafletDocumentResult {
  url: string;
  metadata: UrlMetadata;
}

export interface ILeafletSearchService {
  /**
   * Search for Leaflet documents that link to a specific URL
   */
  searchLeafletDocsForUrl(
    targetUrl: string,
    limit?: number,
    cursor?: string,
  ): Promise<Result<LeafletDocumentResult[], AppError.UnexpectedError>>;
}
