import Redis from 'ioredis';
import {
  IProfileService,
  UserProfile,
} from 'src/modules/cards/domain/services/IProfileService';
import { Result, ok } from 'src/shared/core/Result';
import { IFollowsRepository } from 'src/modules/user/domain/repositories/IFollowsRepository';
import { FollowTargetType } from 'src/modules/user/domain/value-objects/FollowTargetType';

export class CachedBlueskyProfileService implements IProfileService {
  private readonly CACHE_TTL_SECONDS = 3600 * 12; // 12 hours
  private readonly CACHE_KEY_PREFIX = 'profile:';

  constructor(
    private readonly profileService: IProfileService,
    private readonly redis: Redis,
    private readonly followsRepository: IFollowsRepository,
  ) {}

  async getProfile(
    userId: string,
    callerId?: string,
  ): Promise<Result<UserProfile>> {
    const cacheKey = this.getCacheKey(userId);

    try {
      let profile: UserProfile;

      // Try cache first (without follow status)
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        try {
          profile = JSON.parse(cached) as UserProfile;
        } catch (parseError) {
          // If JSON parsing fails, continue to fetch fresh data
          console.warn(
            `Failed to parse cached profile for ${userId}:`,
            parseError,
          );
          // Fall through to fetch from service
          const result = await this.profileService.getProfile(userId, callerId);
          if (result.isErr()) {
            return result;
          }
          profile = result.value;
        }
      } else {
        // Cache miss - fetch from underlying service
        const result = await this.profileService.getProfile(userId, callerId);

        if (result.isErr()) {
          return result;
        }

        profile = result.value;

        // Cache the profile (without follow status)
        try {
          const profileToCache = { ...profile };
          delete profileToCache.isFollowing; // Don't cache follow status
          await this.redis.setex(
            cacheKey,
            this.CACHE_TTL_SECONDS,
            JSON.stringify(profileToCache),
          );
        } catch (cacheError) {
          // Log cache error but don't fail the request
          console.warn(`Failed to cache profile for ${userId}:`, cacheError);
        }
      }

      // Add follow status if callerId is provided
      let isFollowing: boolean | undefined = undefined;
      if (callerId && callerId !== userId) {
        const followResult =
          await this.followsRepository.findByFollowerAndTarget(
            callerId,
            userId,
            FollowTargetType.USER,
          );

        if (followResult.isOk()) {
          isFollowing = followResult.value !== null;
        }
      }

      return ok({
        ...profile,
        isFollowing,
      });
    } catch (redisError) {
      // If Redis is down, fall back to direct service call
      console.warn(
        `Redis error when fetching profile for ${userId}:`,
        redisError,
      );
      return this.profileService.getProfile(userId, callerId);
    }
  }

  private getCacheKey(userId: string): string {
    return `${this.CACHE_KEY_PREFIX}${userId}`;
  }

  /**
   * Invalidate cached profile for a specific user
   */
  async invalidateProfile(userId: string): Promise<void> {
    try {
      await this.redis.del(this.getCacheKey(userId));
    } catch (error) {
      console.warn(`Failed to invalidate profile cache for ${userId}:`, error);
    }
  }

  /**
   * Warm the cache by pre-fetching a profile
   */
  async warmCache(userId: string, callerId?: string): Promise<void> {
    await this.getProfile(userId, callerId);
  }
}
