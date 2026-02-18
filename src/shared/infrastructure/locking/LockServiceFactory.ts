import { ILockService } from './ILockService';
import { RedisLockService } from './RedisLockService';
import { InMemoryLockService } from './InMemoryLockService';
import { RedisFactory } from '../redis/RedisFactory';
import { configService } from '../config';

export class LockServiceFactory {
  static create(): ILockService {
    const useMockPersistence = configService.shouldUseMockPersistence();
    const isProduction = process.env.NODE_ENV === 'production';
    const isFlyInstance = process.env.FLY_ALLOC_ID !== undefined;

    if (!useMockPersistence) {
      try {
        const redis = RedisFactory.createConnection({
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD,
          maxRetriesPerRequest: null,
        });

        return new RedisLockService(redis);
      } catch (error) {
        // In production, Redis is required for proper distributed locking
        if (isProduction) {
          console.error(
            'CRITICAL: Redis connection failed in production environment. ' +
              'Redis is required for distributed locking across multiple instances.',
            error,
          );
          throw new Error(
            'Redis connection required in production for distributed locking. ' +
              `Connection failed: ${error instanceof Error ? error.message : String(error)}`,
          );
        }

        // In development/staging, warn but allow fallback
        console.warn(
          'Failed to connect to Redis, falling back to in-memory locks (development mode):',
          error,
        );
        return new InMemoryLockService();
      }
    }

    return new InMemoryLockService();
  }
}
