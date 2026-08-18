import Redis from 'ioredis';
import { ILockService } from './ILockService';
import { RedisLockService } from './RedisLockService';
import { InMemoryLockService } from './InMemoryLockService';
import { RedisFactory } from '../redis/RedisFactory';
import { configService } from '../config';

export class LockServiceFactory {
  private static instance: ILockService | null = null;
  private static facade: ILockService | null = null;
  private static redis: Redis | null = null;
  private static verificationStarted = false;

  /**
   * Returns the process-wide lock service. The OAuth request lock must be
   * shared by every NodeOAuthClient in this process, so both the service and
   * its Redis connection are memoized.
   *
   * The returned facade delegates per call, so a development-mode fallback to
   * in-memory locks (see verifyConnectivity) also applies to callers that
   * already hold a reference.
   */
  static create(): ILockService {
    if (!this.facade) {
      this.facade = {
        createRequestLock: () => (key, fn) =>
          this.getInstance().createRequestLock()(key, fn),
      };
    }
    // Construct eagerly so verification starts at bootstrap, not on first use
    this.getInstance();
    return this.facade;
  }

  private static getInstance(): ILockService {
    if (this.instance) {
      return this.instance;
    }

    if (configService.shouldUseMockPersistence()) {
      this.instance = new InMemoryLockService();
      return this.instance;
    }

    this.redis = RedisFactory.createFromEnv({ maxRetriesPerRequest: null });
    this.instance = new RedisLockService(this.redis);

    // ioredis connects lazily, so construction cannot fail even when Redis is
    // unreachable. Verify for real in the background: fatal in prod (silent
    // per-process locks would corrupt OAuth sessions across machines),
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
            'Redis is required for distributed OAuth request locking across machines.',
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
      this.instance = new InMemoryLockService();
    }
  }
}
