import Redis from 'ioredis';
import { IMetadataService } from '../domain/services/IMetadataService';
import { UrlMetadata } from '../domain/value-objects/UrlMetadata';
import { URL } from '../domain/value-objects/URL';
import { Result, ok } from '../../../shared/core/Result';

export class CachedMetadataService implements IMetadataService {
  private readonly CACHE_KEY_PREFIX: string;
  private readonly CACHE_TTL_SECONDS: number;

  constructor(
    private readonly metadataService: IMetadataService,
    private readonly redis: Redis,
    private readonly serviceName: string,
    ttlSeconds: number = 3600, // 1 hour default
  ) {
    this.CACHE_KEY_PREFIX = `metadata:${serviceName}:`;
    this.CACHE_TTL_SECONDS = ttlSeconds;
  }

  async fetchMetadata(url: URL): Promise<Result<UrlMetadata>> {
    const cacheKey = this.getCacheKey(url.value);

    try {
      // Try cache first
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        try {
          const metadata = JSON.parse(cached) as UrlMetadata;
          return ok(metadata);
        } catch (parseError) {
          // If JSON parsing fails, continue to fetch fresh data
          console.warn(
            `Failed to parse cached metadata for ${url.value} from ${this.serviceName}:`,
            parseError,
          );
        }
      }

      // Cache miss or parse error - fetch from underlying service
      const result = await this.metadataService.fetchMetadata(url);

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
            `Failed to cache metadata for ${url.value} from ${this.serviceName}:`,
            cacheError,
          );
        }
      }

      return result;
    } catch (redisError) {
      // If Redis is down, fall back to direct service call
      console.warn(
        `Redis error when fetching metadata for ${url.value} from ${this.serviceName}:`,
        redisError,
      );
      return this.metadataService.fetchMetadata(url);
    }
  }

  async isAvailable(): Promise<boolean> {
    return this.metadataService.isAvailable();
  }

  private getCacheKey(url: string): string {
    return `${this.CACHE_KEY_PREFIX}${url}`;
  }

  /**
   * Invalidate cached metadata for a specific URL
   */
  async invalidateMetadata(url: string): Promise<void> {
    try {
      await this.redis.del(this.getCacheKey(url));
    } catch (error) {
      console.warn(
        `Failed to invalidate metadata cache for ${url} from ${this.serviceName}:`,
        error,
      );
    }
  }

  /**
   * Warm the cache by pre-fetching metadata for a URL
   */
  async warmCache(url: URL): Promise<void> {
    await this.fetchMetadata(url);
  }
}
