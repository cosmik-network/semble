import Redis from 'ioredis';
import Redlock from 'redlock';
import { IDistributedLockService } from './IDistributedLockService';

/**
 * Redis-backed distributed locking service using the Redlock algorithm.
 *
 * Provides distributed locking across multiple workers/instances using Redis.
 * Uses the industry-standard Redlock algorithm to ensure lock safety.
 */
export class RedisDistributedLockService implements IDistributedLockService {
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

  async withLock<T>(
    key: string,
    ttl: number,
    fn: () => Promise<T>,
  ): Promise<T> {
    const lock = await this.redlock.acquire([key], ttl);

    try {
      return await fn();
    } finally {
      await this.redlock.release(lock);
    }
  }
}
