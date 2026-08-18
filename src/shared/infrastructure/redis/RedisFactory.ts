import Redis from 'ioredis';

export class RedisFactory {
  /**
   * Single source of truth for building a Redis connection from the
   * environment. Prefers REDIS_URL (the form typically set in production);
   * falls back to the discrete REDIS_HOST/REDIS_PORT/REDIS_PASSWORD vars.
   */
  static createFromEnv(opts?: { maxRetriesPerRequest?: number | null }): Redis {
    const maxRetriesPerRequest = opts?.maxRetriesPerRequest ?? null;

    const url = process.env.REDIS_URL;
    if (url) {
      return new Redis(url, {
        maxRetriesPerRequest,
        family: 6,
      });
    }

    return this.createConnection({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest,
    });
  }

  static createConnection(redisConfig: {
    host: string;
    port: number;
    password?: string;
    maxRetriesPerRequest: number | null;
  }): Redis {
    return new Redis({
      host: redisConfig.host,
      port: redisConfig.port,
      password: redisConfig.password,
      maxRetriesPerRequest: redisConfig.maxRetriesPerRequest,
      username: 'default',
      family: 6,
    });
  }
}
