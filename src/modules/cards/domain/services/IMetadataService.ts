import { UrlMetadata } from '../value-objects/UrlMetadata';
import { URL } from '../value-objects/URL';
import { Result } from '../../../../shared/core/Result';

/**
 * How much latency a caller is willing to pay for metadata.
 * - 'slow' (default): block on every underlying service and merge the results.
 * - 'fast': block only on the fastest service; slower services are still fired
 *   (to warm caches) but only merged in if they resolve almost immediately
 *   (i.e. a cache hit). Composite services interpret this; leaf services may
 *   ignore it.
 */
export type MetadataFetchMode = 'fast' | 'slow';

export interface IMetadataService {
  /**
   * Fetch metadata for a URL from external service
   * @param refetchStaleMetadata - If true, refetch metadata if it's stale (based on service's staleness threshold).
   *                                If false or undefined, always return cached data if available.
   * @param mode - Latency/completeness trade-off; see MetadataFetchMode. Defaults to 'slow'.
   */
  fetchMetadata(
    url: URL,
    refetchStaleMetadata?: boolean,
    mode?: MetadataFetchMode,
  ): Promise<Result<UrlMetadata>>;

  /**
   * Check if the service is available
   */
  isAvailable(): Promise<boolean>;
}
