import Redis from 'ioredis';
import {
  IProfileService,
  UserProfile,
} from 'src/modules/cards/domain/services/IProfileService';
import { Result, ok, err } from 'src/shared/core/Result';
import { IFollowsRepository } from 'src/modules/user/domain/repositories/IFollowsRepository';
import { FollowTargetType } from 'src/modules/user/domain/value-objects/FollowTargetType';
import { SubscriptionScope } from '@semble/types';

interface CacheEnvelope {
  v: 1;
  storedAt: number;
  profile?: UserProfile;
  notFound?: true;
}

export class CachedBlueskyProfileService implements IProfileService {
  // Hard Redis TTL: entries survive long enough for stale-while-revalidate.
  private readonly HARD_TTL_SECONDS = 3600 * 24 * 3; // 3 days
  // Past this age a hit is still served, but a background refresh fires.
  private readonly SOFT_TTL_MS = 3600 * 12 * 1000; // 12 hours
  // Unresolvable ids are remembered briefly so feeds don't hammer the
  // appview for deleted accounts on every request.
  private readonly NEGATIVE_TTL_SECONDS = 600; // 10 minutes
  private readonly CACHE_KEY_PREFIX = 'profile:';

  // Single-flight: at most one upstream resolution per userId at a time.
  private readonly inFlight = new Map<
    string,
    Promise<Map<string, UserProfile>>
  >();

  // Test hook: awaited nowhere in prod; lets tests observe background refreshes.
  onBackgroundRefresh?: () => void;

  constructor(
    private readonly profileService: IProfileService,
    private readonly redis: Redis,
    private readonly followsRepository: IFollowsRepository,
  ) {}

  async getProfile(
    userId: string,
    callerId?: string,
  ): Promise<Result<UserProfile>> {
    const result = await this.getProfiles([userId], callerId);
    if (result.isErr()) {
      return err(result.error);
    }
    const profile = result.value.get(userId);
    return profile
      ? ok(profile)
      : err(new Error(`Profile not found for user ${userId}`));
  }

  async getProfiles(
    userIds: string[],
    callerId?: string,
  ): Promise<Result<Map<string, UserProfile>>> {
    const uniqueIds = [...new Set(userIds)];
    if (uniqueIds.length === 0) {
      return ok(new Map());
    }

    // Follow status is per-caller DB data; resolve it in parallel with the
    // profile lookups rather than per-profile.
    const followStatusPromise = callerId
      ? this.fetchFollowStatus(uniqueIds, callerId)
      : Promise.resolve(undefined);

    let profiles: Map<string, UserProfile>;
    try {
      profiles = await this.resolveProfilesThroughCache(uniqueIds);
    } catch (redisError) {
      console.warn('Redis error in getProfiles, bypassing cache:', redisError);
      const direct = await this.profileService.getProfiles(uniqueIds);
      if (direct.isErr()) {
        return err(direct.error);
      }
      profiles = direct.value;
    }

    const followStatus = await followStatusPromise;
    if (followStatus && callerId) {
      for (const [userId, profile] of profiles) {
        if (userId === callerId) continue;
        profiles.set(userId, { ...profile, ...followStatus.get(userId) });
      }
    }

    return ok(profiles);
  }

  /** Cache-aside resolution with SWR, negative caching and single-flight. */
  private async resolveProfilesThroughCache(
    uniqueIds: string[],
  ): Promise<Map<string, UserProfile>> {
    const keys = uniqueIds.map((id) => this.getCacheKey(id));
    const cachedValues = await this.redis.mget(...keys);

    const resolved = new Map<string, UserProfile>();
    const staleIds: string[] = [];
    const missedIds: string[] = [];

    uniqueIds.forEach((userId, i) => {
      const raw = cachedValues[i];
      if (!raw) {
        missedIds.push(userId);
        return;
      }
      let parsed: CacheEnvelope | UserProfile;
      try {
        parsed = JSON.parse(raw);
      } catch {
        missedIds.push(userId);
        return;
      }
      if ('v' in parsed && parsed.v === 1) {
        if (parsed.notFound) {
          return; // negative hit: known-missing, excluded from result
        }
        if (parsed.profile) {
          resolved.set(userId, parsed.profile);
          if (Date.now() - parsed.storedAt > this.SOFT_TTL_MS) {
            staleIds.push(userId);
          }
          return;
        }
        missedIds.push(userId);
        return;
      }
      // Legacy plain-profile value (pre-envelope deploy): fresh hit.
      resolved.set(userId, parsed as UserProfile);
    });

    if (staleIds.length > 0) {
      void this.fetchAndCache(staleIds)
        .catch((error) =>
          console.warn('Background profile refresh failed:', error),
        )
        .then(() => this.onBackgroundRefresh?.());
    }

    if (missedIds.length > 0) {
      const fetched = await this.fetchWithSingleFlight(missedIds);
      for (const [userId, profile] of fetched) {
        resolved.set(userId, profile);
      }
    }

    return resolved;
  }

  /** Dedup concurrent upstream fetches per userId. */
  private async fetchWithSingleFlight(
    userIds: string[],
  ): Promise<Map<string, UserProfile>> {
    const toFetch = userIds.filter((id) => !this.inFlight.has(id));
    if (toFetch.length > 0) {
      const batchPromise = this.fetchAndCache(toFetch).finally(() => {
        for (const id of toFetch) this.inFlight.delete(id);
      });
      for (const id of toFetch) this.inFlight.set(id, batchPromise);
    }

    const results = new Map<string, UserProfile>();
    const awaited = await Promise.all(
      userIds.map(async (id) => {
        try {
          return [id, await this.inFlight.get(id)] as const;
        } catch {
          return [id, undefined] as const;
        }
      }),
    );
    for (const [id, batchResult] of awaited) {
      const profile = batchResult?.get(id);
      if (profile) results.set(id, profile);
    }
    return results;
  }

  /**
   * One upstream getProfiles call for the batch; write-back is a single
   * pipelined round trip. Ids the upstream cannot resolve get a short-lived
   * negative entry.
   */
  private async fetchAndCache(
    userIds: string[],
  ): Promise<Map<string, UserProfile>> {
    const result = await this.profileService.getProfiles(userIds);
    if (result.isErr()) {
      throw result.error;
    }
    const profiles = result.value;

    try {
      const pipeline = this.redis.pipeline();
      const now = Date.now();
      for (const userId of userIds) {
        const profile = profiles.get(userId);
        if (profile) {
          const toCache = { ...profile };
          delete toCache.isFollowing;
          delete toCache.isSubscribed;
          delete toCache.subscriptionScopes;
          delete toCache.followsYou;
          pipeline.setex(
            this.getCacheKey(userId),
            this.HARD_TTL_SECONDS,
            JSON.stringify({ v: 1, storedAt: now, profile: toCache }),
          );
        } else {
          pipeline.setex(
            this.getCacheKey(userId),
            this.NEGATIVE_TTL_SECONDS,
            JSON.stringify({ v: 1, storedAt: now, notFound: true }),
          );
        }
      }
      await pipeline.exec();
    } catch (cacheError) {
      console.warn('Failed to write profile cache batch:', cacheError);
    }

    return profiles;
  }

  /** Both follow directions for the whole page in two parallel queries. */
  private async fetchFollowStatus(
    userIds: string[],
    callerId: string,
  ): Promise<Map<string, Partial<UserProfile>>> {
    const statusMap = new Map<string, Partial<UserProfile>>();
    for (const userId of userIds) {
      statusMap.set(userId, {
        isFollowing: false,
        isSubscribed: false,
        subscriptionScopes: undefined,
        followsYou: false,
      });
    }

    const [forwardResult, reverseResult] = await Promise.all([
      this.followsRepository.findByFollowerAndTargets(
        callerId,
        userIds,
        FollowTargetType.USER,
      ),
      this.followsRepository.findByFollowersAndTarget(
        userIds,
        callerId,
        FollowTargetType.USER,
      ),
    ]);

    if (forwardResult.isOk()) {
      for (const follow of forwardResult.value) {
        statusMap.set(follow.targetId, {
          ...statusMap.get(follow.targetId),
          isFollowing: true,
          isSubscribed: follow.isSubscribed ?? false,
          subscriptionScopes: follow.subscriptionScopes as
            | SubscriptionScope[]
            | undefined,
        });
      }
    }
    if (reverseResult.isOk()) {
      for (const follow of reverseResult.value) {
        const followerId = follow.followerId.value;
        statusMap.set(followerId, {
          ...statusMap.get(followerId),
          followsYou: true,
        });
      }
    }

    return statusMap;
  }

  private getCacheKey(userId: string): string {
    return `${this.CACHE_KEY_PREFIX}${userId}`;
  }

  async invalidateProfile(userId: string): Promise<void> {
    try {
      await this.redis.del(this.getCacheKey(userId));
    } catch (error) {
      console.warn(`Failed to invalidate profile cache for ${userId}:`, error);
    }
  }

  async warmCache(userId: string, callerId?: string): Promise<void> {
    await this.getProfile(userId, callerId);
  }
}
