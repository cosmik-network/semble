import Redis from 'ioredis';
import { Result, ok } from 'src/shared/core/Result';
import {
  IBskyFollowsService,
  BskyFollowedProfile,
} from '../../application/services/IBskyFollowsService';

/**
 * Caches the resolved set of Semble users a caller follows on Bluesky.
 * The underlying getFollows pagination is expensive, so we cache the
 * intersected result per caller DID for a short TTL.
 */
export class CachedBskyFollowsService implements IBskyFollowsService {
  private readonly CACHE_TTL_SECONDS = 3600 * 6; // 6 hours
  private readonly CACHE_KEY_PREFIX = 'bsky-follows:';

  constructor(
    private readonly bskyFollowsService: IBskyFollowsService,
    private readonly redis: Redis,
  ) {}

  async getSembleUsersFollowedOnBsky(
    callerDid: string,
    maxFollows?: number,
  ): Promise<Result<Map<string, BskyFollowedProfile>>> {
    const cacheKey = this.getCacheKey(callerDid, maxFollows);

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        try {
          const entries = JSON.parse(cached) as BskyFollowedProfile[];
          return ok(new Map(entries.map((p) => [p.did, p])));
        } catch (parseError) {
          console.warn(
            `Failed to parse cached Bluesky follows for ${callerDid}:`,
            parseError,
          );
          // fall through to refetch
        }
      }

      const result = await this.bskyFollowsService.getSembleUsersFollowedOnBsky(
        callerDid,
        maxFollows,
      );

      if (result.isErr()) {
        return result;
      }

      try {
        const entries = Array.from(result.value.values());
        await this.redis.setex(
          cacheKey,
          this.CACHE_TTL_SECONDS,
          JSON.stringify(entries),
        );
      } catch (cacheError) {
        console.warn(
          `Failed to cache Bluesky follows for ${callerDid}:`,
          cacheError,
        );
      }

      return result;
    } catch (redisError) {
      // If Redis is down, fall back to direct service call
      console.warn(
        `Redis error when fetching Bluesky follows for ${callerDid}:`,
        redisError,
      );
      return this.bskyFollowsService.getSembleUsersFollowedOnBsky(
        callerDid,
        maxFollows,
      );
    }
  }

  private getCacheKey(callerDid: string, maxFollows?: number): string {
    return `${this.CACHE_KEY_PREFIX}${callerDid}:${maxFollows ?? 'default'}`;
  }

  /**
   * Invalidate the cached follows for a specific caller
   */
  async invalidate(callerDid: string, maxFollows?: number): Promise<void> {
    try {
      await this.redis.del(this.getCacheKey(callerDid, maxFollows));
    } catch (error) {
      console.warn(
        `Failed to invalidate Bluesky follows cache for ${callerDid}:`,
        error,
      );
    }
  }
}
