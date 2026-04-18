import Redis from 'ioredis';
import { IMetadataService } from '../domain/services/IMetadataService';
import {
  UrlMetadata,
  UrlMetadataProps,
} from '../domain/value-objects/UrlMetadata';
import { URL } from '../domain/value-objects/URL';
import { Result, ok } from '../../../shared/core/Result';

export class CachedMetadataService implements IMetadataService {
  private readonly CACHE_KEY_PREFIX: string;
  private readonly STALENESS_THRESHOLD_SECONDS: number;

  constructor(
    private readonly metadataService: IMetadataService,
    private readonly redis: Redis,
    private readonly serviceName: string,
    stalenessThresholdSeconds: number = 3600, // 1 hour default
  ) {
    this.CACHE_KEY_PREFIX = `metadata:${serviceName}:`;
    this.STALENESS_THRESHOLD_SECONDS = stalenessThresholdSeconds;
  }

  async fetchMetadata(
    url: URL,
    refetchStaleMetadata: boolean = false,
  ): Promise<Result<UrlMetadata>> {
    const cacheKey = this.getCacheKey(url.value);

    try {
      // Try cache first
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        try {
          const metadataResult = UrlMetadata.create(
            JSON.parse(cached) as UrlMetadataProps,
          );
          if (metadataResult.isErr()) {
            throw new Error(
              `Invalid cached metadata for ${url.value} from ${this.serviceName}: ${metadataResult.error.message}`,
            );
          }
          const metadata = metadataResult.value;

          // If refetchStaleMetadata is true, check if cached data is stale
          if (refetchStaleMetadata) {
            // If retrievedAt is missing, treat as stale and refetch
            if (!metadata.retrievedAt) {
              console.log(
                `Cached metadata for ${url.value} from ${this.serviceName} has no retrievedAt, treating as stale...`,
              );
              // Continue to fetch fresh data below
            } else {
              const now = new Date();
              const retrievedAt = new Date(metadata.retrievedAt);
              const ageInSeconds =
                (now.getTime() - retrievedAt.getTime()) / 1000;

              if (ageInSeconds > this.STALENESS_THRESHOLD_SECONDS) {
                // Data is stale, fetch fresh data
                console.log(
                  `Cached metadata for ${url.value} from ${this.serviceName} is stale (${ageInSeconds}s old), refetching...`,
                );
                // Continue to fetch fresh data below
              } else {
                // Data is fresh enough, return cached
                return ok(metadata);
              }
            }
          } else {
            // Not refetching stale data, always return cached if available
            return ok(metadata);
          }
        } catch (parseError) {
          // If JSON parsing fails, continue to fetch fresh data
          console.warn(
            `Failed to parse cached metadata for ${url.value} from ${this.serviceName}:`,
            parseError,
          );
        }
      }

      // Cache miss, parse error, or stale data - fetch from underlying service
      const result = await this.metadataService.fetchMetadata(url);

      if (result.isOk()) {
        // Cache the successful result with infinite TTL
        try {
          await this.redis.set(cacheKey, JSON.stringify(result.value.props));
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
