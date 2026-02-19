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
  private readonly COUNTS_CACHE_TTL_SECONDS = 900; // 15 minutes
  private readonly COUNTS_CACHE_KEY_PREFIX = 'profile:counts:';

  constructor(
    private readonly profileService: IProfileService,
    private readonly redis: Redis,
    private readonly followsRepository: IFollowsRepository,
  ) {}

  async getProfile(
    userId: string,
    callerId?: string,
  ): Promise<Result<UserProfile>> {
    const profileCacheKey = this.getCacheKey(userId);
    const countsCacheKey = this.getCountsCacheKey(userId);

    try {
      // Fetch both profile and counts from cache in parallel
      const [cachedProfile, cachedCounts] = await Promise.all([
        this.redis.get(profileCacheKey),
        this.redis.get(countsCacheKey),
      ]);

      let profile: UserProfile;
      let counts: {
        followerCount: number;
        followingCount: number;
        followedCollectionsCount: number;
      };

      // Handle profile cache
      if (cachedProfile) {
        try {
          profile = JSON.parse(cachedProfile) as UserProfile;
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

        // Cache the profile (without follow status and counts)
        try {
          const profileToCache = { ...profile };
          delete profileToCache.isFollowing;
          delete profileToCache.followerCount;
          delete profileToCache.followingCount;
          delete profileToCache.followedCollectionsCount;
          await this.redis.setex(
            profileCacheKey,
            this.CACHE_TTL_SECONDS,
            JSON.stringify(profileToCache),
          );
        } catch (cacheError) {
          // Log cache error but don't fail the request
          console.warn(`Failed to cache profile for ${userId}:`, cacheError);
        }
      }

      // Handle counts cache
      if (cachedCounts) {
        try {
          counts = JSON.parse(cachedCounts) as {
            followerCount: number;
            followingCount: number;
            followedCollectionsCount: number;
          };
        } catch (parseError) {
          console.warn(
            `Failed to parse cached counts for ${userId}:`,
            parseError,
          );
          // Use counts from profile or defaults
          counts = {
            followerCount: profile.followerCount ?? 0,
            followingCount: profile.followingCount ?? 0,
            followedCollectionsCount: profile.followedCollectionsCount ?? 0,
          };
        }
      } else {
        // Counts cache miss - use from profile or fetch fresh
        if (
          profile.followerCount !== undefined &&
          profile.followingCount !== undefined &&
          profile.followedCollectionsCount !== undefined
        ) {
          counts = {
            followerCount: profile.followerCount,
            followingCount: profile.followingCount,
            followedCollectionsCount: profile.followedCollectionsCount,
          };
        } else {
          // If profile doesn't have counts, fetch fresh
          const result = await this.profileService.getProfile(userId, callerId);
          if (result.isOk()) {
            counts = {
              followerCount: result.value.followerCount ?? 0,
              followingCount: result.value.followingCount ?? 0,
              followedCollectionsCount:
                result.value.followedCollectionsCount ?? 0,
            };
          } else {
            counts = {
              followerCount: 0,
              followingCount: 0,
              followedCollectionsCount: 0,
            };
          }
        }

        // Cache the counts
        try {
          await this.redis.setex(
            countsCacheKey,
            this.COUNTS_CACHE_TTL_SECONDS,
            JSON.stringify(counts),
          );
        } catch (cacheError) {
          console.warn(`Failed to cache counts for ${userId}:`, cacheError);
        }
      }

      // Add follow status if callerId is provided
      let isFollowing: boolean | undefined = undefined;
      let followsYou: boolean | undefined = undefined;
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

        // Check if the profile user follows the caller
        const followsYouResult =
          await this.followsRepository.findByFollowerAndTarget(
            userId,
            callerId,
            FollowTargetType.USER,
          );

        if (followsYouResult.isOk()) {
          followsYou = followsYouResult.value !== null;
        }
      }

      return ok({
        ...profile,
        isFollowing,
        followsYou,
        ...counts,
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

  private getCountsCacheKey(userId: string): string {
    return `${this.COUNTS_CACHE_KEY_PREFIX}${userId}`;
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
   * Invalidate cached counts for a specific user
   */
  async invalidateCounts(userId: string): Promise<void> {
    try {
      await this.redis.del(this.getCountsCacheKey(userId));
    } catch (error) {
      console.warn(`Failed to invalidate counts cache for ${userId}:`, error);
    }
  }

  /**
   * Warm the cache by pre-fetching a profile
   */
  async warmCache(userId: string, callerId?: string): Promise<void> {
    await this.getProfile(userId, callerId);
  }
}
