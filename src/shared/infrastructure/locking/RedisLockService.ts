import { RuntimeLock } from '@atproto/oauth-client-node';
import Redis from 'ioredis';
import Redlock from 'redlock';
import { ILockService } from './ILockService';

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

      // Reduced to 10 seconds to prevent long-lived locks on container restarts
      const lock = await this.redlock.acquire([lockKey], 10000);

      try {
        return await fn();
      } finally {
        await this.redlock.release(lock);
      }
    };
  }
}
