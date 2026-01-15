import Redis from 'ioredis';
import { ILeafletSearchService, LeafletDocumentResult } from '../domain/services/ILeafletSearchService';
import { Result, ok } from '../../../shared/core/Result';
import { AppError } from '../../../shared/core/AppError';

export class CachedLeafletSearchService implements ILeafletSearchService {
  private readonly CACHE_TTL_SECONDS = 3600 * 24; // 24 hours
  private readonly CACHE_KEY_PREFIX = 'leaflet_search:';

  constructor(
    private readonly leafletSearchService: ILeafletSearchService,
    private readonly redis: Redis,
  ) {}

  async searchLeafletDocsForUrl(
    targetUrl: string,
    limit?: number,
    cursor?: string,
  ): Promise<Result<LeafletDocumentResult[], AppError.UnexpectedError>> {
    const cacheKey = this.getCacheKey(targetUrl, limit, cursor);

    try {
      // Try cache first
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        try {
          const results = JSON.parse(cached) as LeafletDocumentResult[];
          return ok(results);
        } catch (parseError) {
          // If JSON parsing fails, continue to fetch fresh data
          console.warn(
            `Failed to parse cached leaflet search results for ${targetUrl}:`,
            parseError,
          );
        }
      }

      // Cache miss or parse error - fetch from underlying service
      const result = await this.leafletSearchService.searchLeafletDocsForUrl(
        targetUrl,
        limit,
        cursor,
      );

      if (result.isOk()) {
        // Cache the successful result
        try {
          await this.redis.setex(
            cacheKey,
            this.CACHE_TTL_SECONDS,
            JSON.stringify(result.value),
          );
        } catch (cacheError) {
          // Log cache error but don't fail the request
          console.warn(
            `Failed to cache leaflet search results for ${targetUrl}:`,
            cacheError,
          );
        }
      }

      return result;
    } catch (redisError) {
      // If Redis is down, fall back to direct service call
      console.warn(
        `Redis error when searching leaflet docs for ${targetUrl}:`,
        redisError,
      );
      return this.leafletSearchService.searchLeafletDocsForUrl(
        targetUrl,
        limit,
        cursor,
      );
    }
  }

  private getCacheKey(targetUrl: string, limit?: number, cursor?: string): string {
    // Create a deterministic cache key that includes all parameters
    const params = [
      targetUrl,
      limit?.toString() || 'no_limit',
      cursor || 'no_cursor',
    ].join('|');
    
    return `${this.CACHE_KEY_PREFIX}${params}`;
  }

  /**
   * Invalidate cached results for a specific URL
   */
  async invalidateUrl(targetUrl: string): Promise<void> {
    try {
      // Since we don't know all possible limit/cursor combinations,
      // we'll use a pattern to delete all keys for this URL
      const pattern = `${this.CACHE_KEY_PREFIX}${targetUrl}|*`;
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.warn(
        `Failed to invalidate leaflet search cache for ${targetUrl}:`,
        error,
      );
    }
  }

  /**
   * Clear all cached leaflet search results
   */
  async clearAllCache(): Promise<void> {
    try {
      const pattern = `${this.CACHE_KEY_PREFIX}*`;
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.warn('Failed to clear leaflet search cache:', error);
    }
  }

  /**
   * Warm the cache by pre-fetching results for a URL
   */
  async warmCache(targetUrl: string, limit?: number, cursor?: string): Promise<void> {
    await this.searchLeafletDocsForUrl(targetUrl, limit, cursor);
  }
}
