import { RuntimeLock } from '@atproto/oauth-client-node';
import Redis from 'ioredis';
import Redlock from 'redlock';
import { ILockService } from './ILockService';

// The oauth-client library holds the request lock around a full token refresh,
// which it bounds internally at 30s. The lock TTL must exceed that so the lock
// can never expire while a refresh is in flight (an expired lock lets a second
// process refresh concurrently with the same single-use refresh token, which
// kills the session with invalid_grant).
const LOCK_TTL_MS = 45_000;

// Waiters must be able to wait out a full refresh by the current holder
// instead of failing with "unable to achieve a quorum": ~80 * (500 ± 200)ms
// ≈ 40-56s of retrying.
const ACQUIRE_SETTINGS = {
  retryCount: 80,
  retryDelay: 500, // ms
  retryJitter: 200, // ms
};

const SLOW_ACQUIRE_THRESHOLD_MS = 2_000;

export class RedisLockService implements ILockService {
  private redlock: Redlock;

  constructor(private redis: Redis) {
    this.redlock = new Redlock([redis], {
      // Retry settings
      retryCount: 3,
      retryDelay: 200, // ms
      retryJitter: 200, // ms
    });

    // Handle Fly.io container shutdown gracefully
    process.on('SIGTERM', () => {
      console.log('Received SIGTERM, shutting down gracefully...');
      // Redlock will automatically release locks when the process exits
      // No manual cleanup needed due to TTL
    });
  }

  createRequestLock(): RuntimeLock {
    return async (key: string, fn: () => any) => {
      // Use shared lock key across all instances for proper distributed locking
      const lockKey = `oauth:lock:${key}`;
      const processGroup = process.env.FLY_PROCESS_GROUP || 'unknown';

      const acquireStart = Date.now();
      let lock;
      try {
        lock = await this.redlock.acquire(
          [lockKey],
          LOCK_TTL_MS,
          ACQUIRE_SETTINGS,
        );
      } catch (error) {
        console.error(
          `[RedisLockService] Failed to acquire lock ${lockKey} after ${Date.now() - acquireStart}ms (process: ${processGroup})`,
          error,
        );
        throw error;
      }

      const acquireDuration = Date.now() - acquireStart;
      if (acquireDuration > SLOW_ACQUIRE_THRESHOLD_MS) {
        console.warn(
          `[RedisLockService] Contended lock ${lockKey} acquired after ${acquireDuration}ms (process: ${processGroup})`,
        );
      }

      try {
        return await fn();
      } finally {
        // Never let a failed release (e.g. after TTL expiry) mask fn()'s
        // result or error.
        await this.redlock.release(lock).catch((releaseError) => {
          console.warn(
            `[RedisLockService] Failed to release lock ${lockKey} (likely TTL expiry; process: ${processGroup})`,
            releaseError,
          );
        });
      }
    };
  }
}
