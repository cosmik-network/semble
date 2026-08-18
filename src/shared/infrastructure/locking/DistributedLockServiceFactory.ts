import Redis from 'ioredis';
import { IDistributedLockService } from './IDistributedLockService';
import { RedisDistributedLockService } from './RedisDistributedLockService';
import { InMemoryDistributedLockService } from './InMemoryDistributedLockService';
import { RedisFactory } from '../redis/RedisFactory';
import { configService } from '../config';

export class DistributedLockServiceFactory {
  private static instance: IDistributedLockService | null = null;
  private static facade: IDistributedLockService | null = null;
  private static redis: Redis | null = null;
  private static verificationStarted = false;

  /**
   * Returns the process-wide distributed lock service (memoized, one Redis
   * connection). The facade delegates per call so a development-mode fallback
   * to in-memory locks also applies to callers that already hold a reference.
   */
  static create(): IDistributedLockService {
    if (!this.facade) {
      this.facade = {
        withLock: (key, ttl, fn) => this.getInstance().withLock(key, ttl, fn),
      };
    }
    // Construct eagerly so verification starts at bootstrap, not on first use
    this.getInstance();
    return this.facade;
  }

  private static getInstance(): IDistributedLockService {
    if (this.instance) {
      return this.instance;
    }

    if (configService.shouldUseMockPersistence()) {
      this.instance = new InMemoryDistributedLockService();
      return this.instance;
    }

    this.redis = RedisFactory.createFromEnv({ maxRetriesPerRequest: null });
    this.instance = new RedisDistributedLockService(this.redis);

    // ioredis connects lazily, so construction cannot fail even when Redis is
    // unreachable. Verify for real in the background: fatal in prod,
    // downgrade to in-memory locks in development.
    if (!this.verificationStarted) {
      this.verificationStarted = true;
      void this.verifyConnectivity();
    }

    return this.instance;
  }

  static async verifyConnectivity(timeoutMs: number = 5000): Promise<void> {
    if (!this.redis) {
      return; // in-memory service, nothing to verify
    }

    try {
      await Promise.race([
        this.redis.ping(),
        new Promise((_, reject) =>
          setTimeout(
            () =>
              reject(new Error(`Redis ping timed out after ${timeoutMs}ms`)),
            timeoutMs,
          ),
        ),
      ]);
    } catch (error) {
      // fly.production.toml sets NODE_ENV="prod", so check the resolved
      // environment rather than NODE_ENV === 'production'.
      if (configService.get().environment === 'prod') {
        console.error(
          'CRITICAL: Lock Redis is unreachable in production. ' +
            'Redis is required for distributed locking across machines.',
          error,
        );
        process.exit(1);
      }

      console.warn(
        'Lock Redis unreachable, falling back to in-memory locks (development mode):',
        error,
      );
      this.redis.disconnect();
      this.redis = null;
      this.instance = new InMemoryDistributedLockService();
    }
  }
}
