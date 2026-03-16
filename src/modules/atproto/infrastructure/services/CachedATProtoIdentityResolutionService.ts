import Redis from 'ioredis';
import { Result, ok, err } from 'src/shared/core/Result';
import { IIdentityResolutionService } from '../../domain/services/IIdentityResolutionService';
import { DID } from '../../domain/DID';
import { DIDOrHandle } from '../../domain/DIDOrHandle';
import { Handle } from '../../domain/Handle';

export class CachedATProtoIdentityResolutionService
  implements IIdentityResolutionService
{
  private readonly CACHE_TTL_SECONDS = 900; // 15 minutes
  private readonly CACHE_KEY_PREFIX = 'handle-to-did:';

  constructor(
    private readonly identityResolutionService: IIdentityResolutionService,
    private readonly redis: Redis,
  ) {}

  async resolveToDID(identifier: DIDOrHandle): Promise<Result<DID>> {
    try {
      // If it's already a DID, return it directly (no caching needed)
      if (identifier.isDID) {
        return this.identityResolutionService.resolveToDID(identifier);
      }

      // If it's a handle, check cache first
      const handle = identifier.getHandle();
      if (!handle) {
        return err(new Error('Invalid handle in identifier'));
      }

      const cacheKey = this.getCacheKey(handle.value);

      try {
        // Try to get DID from cache
        const cachedDID = await this.redis.get(cacheKey);

        if (cachedDID) {
          try {
            const didResult = DID.create(cachedDID);
            if (didResult.isOk()) {
              return ok(didResult.value);
            }
            // If cached value is invalid, fall through to fetch fresh data
          } catch (parseError) {
            console.warn(
              `Failed to parse cached DID for handle ${handle.value}:`,
              parseError,
            );
          }
        }
      } catch (redisError) {
        // If Redis read fails, log and continue to fetch from service
        console.warn(
          `Redis error when fetching cached DID for handle ${handle.value}:`,
          redisError,
        );
      }

      // Cache miss or invalid - fetch from underlying service
      const result =
        await this.identityResolutionService.resolveToDID(identifier);

      if (result.isErr()) {
        return result;
      }

      // Cache the DID
      try {
        await this.redis.setex(
          cacheKey,
          this.CACHE_TTL_SECONDS,
          result.value.value,
        );
      } catch (cacheError) {
        // Log cache error but don't fail the request
        console.warn(
          `Failed to cache DID for handle ${handle.value}:`,
          cacheError,
        );
      }

      return result;
    } catch (error) {
      // If anything unexpected happens, fall back to the base service
      console.warn(
        `Unexpected error in cached identity resolution, falling back to base service:`,
        error,
      );
      return this.identityResolutionService.resolveToDID(identifier);
    }
  }

  async resolveToHandle(identifier: DIDOrHandle): Promise<Result<Handle>> {
    // No caching for DID to handle resolution, just pass through
    return this.identityResolutionService.resolveToHandle(identifier);
  }

  private getCacheKey(handle: string): string {
    return `${this.CACHE_KEY_PREFIX}${handle}`;
  }

  /**
   * Invalidate cached DID for a specific handle
   */
  async invalidateHandle(handle: string): Promise<void> {
    try {
      await this.redis.del(this.getCacheKey(handle));
    } catch (error) {
      console.warn(
        `Failed to invalidate DID cache for handle ${handle}:`,
        error,
      );
    }
  }

  /**
   * Warm the cache by pre-fetching a handle resolution
   */
  async warmCache(handle: string): Promise<void> {
    const identifierResult = DIDOrHandle.create(handle);
    if (identifierResult.isOk()) {
      await this.resolveToDID(identifierResult.value);
    }
  }
}
