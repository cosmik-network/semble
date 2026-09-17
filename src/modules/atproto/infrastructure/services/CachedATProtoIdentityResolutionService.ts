import Redis from 'ioredis';
import { Result, ok, err } from 'src/shared/core/Result';
import { IIdentityResolutionService } from '../../domain/services/IIdentityResolutionService';
import { DID } from '../../domain/DID';
import { DIDOrHandle } from '../../domain/DIDOrHandle';
import { Handle } from '../../domain/Handle';

export class CachedATProtoIdentityResolutionService implements IIdentityResolutionService {
  // Handles rarely move between DIDs; a long TTL keeps this hot path off the
  // network. Signing keys can rotate and are used for JWT verification, so
  // they keep a short TTL.
  private readonly HANDLE_CACHE_TTL_SECONDS = 3600 * 24; // 24 hours
  private readonly KEY_CACHE_TTL_SECONDS = 900; // 15 minutes
  private readonly HANDLE_TO_DID_PREFIX = 'handle-to-did:';
  private readonly DID_TO_HANDLE_PREFIX = 'did-to-handle:';
  private readonly DID_TO_KEY_PREFIX = 'did-to-key:';

  // Coalesces concurrent cache misses for the same key into one upstream
  // resolution (single-flight), keyed by cache key.
  private readonly inFlight = new Map<string, Promise<Result<string>>>();

  constructor(
    private readonly identityResolutionService: IIdentityResolutionService,
    private readonly redis: Redis,
  ) {}

  async resolveToDID(identifier: DIDOrHandle): Promise<Result<DID>> {
    // If it's already a DID, return it directly (no caching needed)
    if (identifier.isDID) {
      return this.identityResolutionService.resolveToDID(identifier);
    }

    const handle = identifier.getHandle();
    if (!handle) {
      return err(new Error('Invalid handle in identifier'));
    }

    const result = await this.getCachedOrResolve(
      this.getHandleToDIDCacheKey(handle.value),
      this.HANDLE_CACHE_TTL_SECONDS,
      async () => {
        const resolved =
          await this.identityResolutionService.resolveToDID(identifier);
        return resolved.isErr()
          ? err(resolved.error)
          : ok(resolved.value.value);
      },
    );

    if (result.isErr()) {
      return err(result.error);
    }

    const didResult = DID.create(result.value);
    if (didResult.isErr()) {
      return err(new Error(`Invalid cached DID: ${didResult.error.message}`));
    }
    return ok(didResult.value);
  }

  async resolveToHandle(identifier: DIDOrHandle): Promise<Result<Handle>> {
    // If it's already a handle, no resolution or caching needed
    if (identifier.isHandle) {
      return this.identityResolutionService.resolveToHandle(identifier);
    }

    const did = identifier.getDID();
    if (!did) {
      return err(new Error('Invalid DID in identifier'));
    }

    const result = await this.getCachedOrResolve(
      this.getDIDToHandleCacheKey(did.value),
      this.HANDLE_CACHE_TTL_SECONDS,
      async () => {
        const resolved =
          await this.identityResolutionService.resolveToHandle(identifier);
        return resolved.isErr()
          ? err(resolved.error)
          : ok(resolved.value.value);
      },
    );

    if (result.isErr()) {
      return err(result.error);
    }

    const handleResult = Handle.create(result.value);
    if (handleResult.isErr()) {
      return err(
        new Error(`Invalid cached handle: ${handleResult.error.message}`),
      );
    }
    return ok(handleResult.value);
  }

  async resolveAtprotoKey(did: string): Promise<Result<string>> {
    return this.getCachedOrResolve(
      this.getDIDToKeyCacheKey(did),
      this.KEY_CACHE_TTL_SECONDS,
      () => this.identityResolutionService.resolveAtprotoKey(did),
    );
  }

  /**
   * Cache-aside with single-flight: read from Redis, and on a miss run
   * `resolve` at most once per key across concurrent callers, caching the
   * successful value. Redis failures degrade to calling `resolve`.
   */
  private async getCachedOrResolve(
    cacheKey: string,
    ttlSeconds: number,
    resolve: () => Promise<Result<string>>,
  ): Promise<Result<string>> {
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return ok(cached);
      }
    } catch (redisError) {
      console.warn(`Redis error reading ${cacheKey}:`, redisError);
    }

    const existing = this.inFlight.get(cacheKey);
    if (existing) {
      return existing;
    }

    const resolution = (async (): Promise<Result<string>> => {
      const result = await resolve();
      if (result.isErr()) {
        return result;
      }

      try {
        await this.redis.setex(cacheKey, ttlSeconds, result.value);
      } catch (cacheError) {
        console.warn(`Failed to cache ${cacheKey}:`, cacheError);
      }

      return result;
    })().finally(() => {
      this.inFlight.delete(cacheKey);
    });

    this.inFlight.set(cacheKey, resolution);
    return resolution;
  }

  private getHandleToDIDCacheKey(handle: string): string {
    return `${this.HANDLE_TO_DID_PREFIX}${handle}`;
  }

  private getDIDToHandleCacheKey(did: string): string {
    return `${this.DID_TO_HANDLE_PREFIX}${did}`;
  }

  private getDIDToKeyCacheKey(did: string): string {
    return `${this.DID_TO_KEY_PREFIX}${did}`;
  }

  /**
   * Invalidate cached DID for a specific handle
   */
  async invalidateHandle(handle: string): Promise<void> {
    try {
      await this.redis.del(this.getHandleToDIDCacheKey(handle));
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
