import Redis from 'ioredis';
import { StatsCache } from '../../infrastructure/StatsCache';
import { CachedProductAnalyticsQueryRepository } from '../../infrastructure/repositories/CachedProductAnalyticsQueryRepository';
import { IProductAnalyticsQueryRepository } from '../../domain/IProductAnalyticsQueryRepository';

class FakeRedis {
  store = new Map<string, string>();
  ttls = new Map<string, number>();
  failing = false;

  async get(key: string) {
    if (this.failing) throw new Error('redis down');
    return this.store.get(key) ?? null;
  }

  async setex(key: string, ttl: number, value: string) {
    if (this.failing) throw new Error('redis down');
    this.store.set(key, value);
    this.ttls.set(key, ttl);
    return 'OK';
  }
}

describe('StatsCache', () => {
  let redis: FakeRedis;
  let cache: StatsCache;

  beforeEach(() => {
    redis = new FakeRedis();
    cache = new StatsCache(redis as unknown as Redis);
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shares one computation between concurrent calls for the same key', async () => {
    const compute = jest.fn(async () => ({ value: 1 }));

    const results = await Promise.all([
      cache.getOrCompute('k', 60, compute),
      cache.getOrCompute('k', 60, compute),
      cache.getOrCompute('k', 60, compute),
    ]);

    expect(compute).toHaveBeenCalledTimes(1);
    expect(results).toEqual([{ value: 1 }, { value: 1 }, { value: 1 }]);
  });

  it('serves subsequent calls from Redis', async () => {
    const compute = jest.fn(async () => ({ value: 1 }));

    await cache.getOrCompute('k', 60, compute);
    const second = await cache.getOrCompute('k', 60, compute);

    expect(compute).toHaveBeenCalledTimes(1);
    expect(second).toEqual({ value: 1 });
    expect(redis.ttls.get('stats:v1:k')).toBe(60);
  });

  it('falls through to the computation when Redis errors', async () => {
    redis.failing = true;
    const compute = jest.fn(async () => ({ value: 2 }));

    await expect(cache.getOrCompute('k', 60, compute)).resolves.toEqual({
      value: 2,
    });
    expect(compute).toHaveBeenCalledTimes(1);
  });

  it('does not cache failed computations', async () => {
    const compute = jest
      .fn()
      .mockRejectedValueOnce(new Error('db timeout'))
      .mockResolvedValueOnce({ value: 3 });

    await expect(cache.getOrCompute('k', 60, compute)).rejects.toThrow(
      'db timeout',
    );
    await expect(cache.getOrCompute('k', 60, compute)).resolves.toEqual({
      value: 3,
    });
  });
});

describe('CachedProductAnalyticsQueryRepository', () => {
  it('shares an entry across endWeek dates within the same ISO week', async () => {
    const redis = new FakeRedis();
    const inner = {
      getWacStats: jest.fn(async () => ({
        dataPoints: [],
        periodStart: '',
        periodEnd: '',
      })),
    } as unknown as IProductAnalyticsQueryRepository;
    const repo = new CachedProductAnalyticsQueryRepository(
      inner,
      new StatsCache(redis as unknown as Redis),
    );

    // 2026-06-15 is a Monday; 2026-06-18 is the Thursday of the same week
    await repo.getWacStats({ endWeek: '2026-06-15', weeks: 4 });
    await repo.getWacStats({ endWeek: '2026-06-18', weeks: 4 });
    await repo.getWacStats({ endWeek: '2026-06-18', weeks: 8 });

    expect(inner.getWacStats).toHaveBeenCalledTimes(2);
    // A fully completed historical range gets the long TTL
    expect(redis.ttls.get('stats:v1:wac:2026-06-15T00:00:00.000Z:4')).toBe(
      12 * 3600,
    );
  });
});
