import Redis from 'ioredis';

// Bump to invalidate every cached stats payload (e.g. after a DTO shape change).
const CACHE_KEY_PREFIX = 'stats:v1:';

/**
 * Read-through cache for expensive stats queries.
 *
 * - Redis-backed when a connection is given; Redis errors fall through to the
 *   underlying query rather than failing the request.
 * - Concurrent calls for the same key share one in-flight computation, so a
 *   dashboard loading many panels (or several viewers refreshing at once)
 *   runs each query once per process instead of once per request.
 */
export class StatsCache {
  private inFlight = new Map<string, Promise<unknown>>();

  constructor(private readonly redis?: Redis) {}

  async getOrCompute<T>(
    key: string,
    ttlSeconds: number,
    compute: () => Promise<T>,
  ): Promise<T> {
    const cacheKey = `${CACHE_KEY_PREFIX}${key}`;

    const pending = this.inFlight.get(cacheKey);
    if (pending) {
      return pending as Promise<T>;
    }

    const promise = this.readThrough(cacheKey, ttlSeconds, compute);
    this.inFlight.set(cacheKey, promise);
    try {
      return await promise;
    } finally {
      this.inFlight.delete(cacheKey);
    }
  }

  private async readThrough<T>(
    cacheKey: string,
    ttlSeconds: number,
    compute: () => Promise<T>,
  ): Promise<T> {
    if (this.redis) {
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached) as T;
        }
      } catch (cacheError) {
        console.warn(
          `Redis error reading stats cache for ${cacheKey}:`,
          cacheError,
        );
      }
    }

    const value = await compute();

    if (this.redis) {
      try {
        await this.redis.setex(cacheKey, ttlSeconds, JSON.stringify(value));
      } catch (cacheError) {
        console.warn(
          `Redis error writing stats cache for ${cacheKey}:`,
          cacheError,
        );
      }
    }

    return value;
  }
}
