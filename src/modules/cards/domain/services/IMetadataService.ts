import { UrlMetadata } from '../value-objects/UrlMetadata';
import { URL } from '../value-objects/URL';
import { Result } from '../../../../shared/core/Result';

export interface IMetadataService {
  /**
   * Fetch metadata for a URL from external service
   * @param refetchStaleMetadata - If true, refetch metadata if it's stale (based on service's staleness threshold).
   *                                If false or undefined, always return cached data if available.
   */
  fetchMetadata(
    url: URL,
    refetchStaleMetadata?: boolean,
  ): Promise<Result<UrlMetadata>>;

  /**
   * Check if the service is available
   */
  isAvailable(): Promise<boolean>;
}
