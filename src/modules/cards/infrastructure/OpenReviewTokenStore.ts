import Redis from 'ioredis';

/**
 * Persists the OpenReview access token so it can be shared across processes
 * (API instances, workers) and survive restarts instead of logging in each time.
 */
export interface IOpenReviewTokenStore {
  get(): Promise<string | null>;
  /** Store the token until expiresAt; implementations must not return it after that. */
  set(token: string, expiresAt: Date): Promise<void>;
  delete(): Promise<void>;
}

export class InMemoryOpenReviewTokenStore implements IOpenReviewTokenStore {
  private token: string | null = null;
  private expiresAt: Date | null = null;

  async get(): Promise<string | null> {
    if (!this.token || !this.expiresAt || this.expiresAt <= new Date()) {
      return null;
    }
    return this.token;
  }

  async set(token: string, expiresAt: Date): Promise<void> {
    this.token = token;
    this.expiresAt = expiresAt;
  }

  async delete(): Promise<void> {
    this.token = null;
    this.expiresAt = null;
  }
}

export class RedisOpenReviewTokenStore implements IOpenReviewTokenStore {
  private static readonly KEY = 'openreview:access-token';

  constructor(private readonly redis: Redis) {}

  async get(): Promise<string | null> {
    return this.redis.get(RedisOpenReviewTokenStore.KEY);
  }

  async set(token: string, expiresAt: Date): Promise<void> {
    const ttlSeconds = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
    if (ttlSeconds <= 0) return;
    // Redis expires the key itself, so a stale token is never handed out
    await this.redis.set(
      RedisOpenReviewTokenStore.KEY,
      token,
      'EX',
      ttlSeconds,
    );
  }

  async delete(): Promise<void> {
    await this.redis.del(RedisOpenReviewTokenStore.KEY);
  }
}
