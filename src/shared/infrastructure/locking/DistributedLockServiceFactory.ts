import { IDistributedLockService } from './IDistributedLockService';
import { RedisDistributedLockService } from './RedisDistributedLockService';
import { InMemoryDistributedLockService } from './InMemoryDistributedLockService';
import { RedisFactory } from '../redis/RedisFactory';
import { configService } from '../config';

export class DistributedLockServiceFactory {
  static create(): IDistributedLockService {
    const useMockPersistence = configService.shouldUseMockPersistence();
    const isProduction = process.env.NODE_ENV === 'production';

    if (!useMockPersistence) {
      try {
        const redis = RedisFactory.createConnection({
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD,
          maxRetriesPerRequest: null,
        });

        return new RedisDistributedLockService(redis);
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
        return new InMemoryDistributedLockService();
      }
    }

    return new InMemoryDistributedLockService();
  }
}
