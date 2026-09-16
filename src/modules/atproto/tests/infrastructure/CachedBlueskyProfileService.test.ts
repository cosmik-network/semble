import { ok, err, Result } from 'src/shared/core/Result';
import { CachedBlueskyProfileService } from '../../infrastructure/services/CachedBlueskyProfileService';
import {
  IProfileService,
  UserProfile,
} from 'src/modules/cards/domain/services/IProfileService';
import { IFollowsRepository } from 'src/modules/user/domain/repositories/IFollowsRepository';

class FakeRedis {
  store = new Map<string, { value: string; ttl: number }>();
  failMode = false;
  mgetCalls: string[][] = [];

  async get(key: string): Promise<string | null> {
    if (this.failMode) throw new Error('redis down');
    return this.store.get(key)?.value ?? null;
  }
  async mget(...keys: string[]): Promise<(string | null)[]> {
    if (this.failMode) throw new Error('redis down');
    this.mgetCalls.push(keys);
    return keys.map((k) => this.store.get(k)?.value ?? null);
  }
  async setex(key: string, ttl: number, value: string): Promise<'OK'> {
    if (this.failMode) throw new Error('redis down');
    this.store.set(key, { value, ttl });
    return 'OK';
  }
  async del(key: string): Promise<number> {
    return this.store.delete(key) ? 1 : 0;
  }
  pipeline() {
    const cmds: Array<() => Promise<unknown>> = [];
    const self = this;
    const p = {
      setex(key: string, ttl: number, value: string) {
        cmds.push(() => self.setex(key, ttl, value));
        return p;
      },
      async exec() {
        const out: Array<[null, unknown]> = [];
        for (const cmd of cmds) out.push([null, await cmd()]);
        return out;
      },
    };
    return p;
  }
}

class RecordingProfileService implements IProfileService {
  batchCalls: string[][] = [];
  profiles = new Map<string, UserProfile>();
  failAll = false;

  async getProfile(userId: string): Promise<Result<UserProfile>> {
    const result = await this.getProfiles([userId]);
    if (result.isErr()) return err(result.error);
    const profile = result.value.get(userId);
    return profile ? ok(profile) : err(new Error('not found'));
  }
  async getProfiles(
    userIds: string[],
  ): Promise<Result<Map<string, UserProfile>>> {
    if (this.failAll) return err(new Error('appview down'));
    this.batchCalls.push([...userIds]);
    const map = new Map<string, UserProfile>();
    for (const id of userIds) {
      const profile = this.profiles.get(id);
      if (profile) map.set(id, profile);
    }
    return ok(map);
  }
}

function profile(id: string): UserProfile {
  return { id, name: `Name ${id}`, handle: `${id}.test` };
}

function makeFollowsRepo(overrides?: Partial<IFollowsRepository>) {
  return {
    findByFollowerAndTargets: jest.fn().mockResolvedValue(ok([])),
    findByFollowersAndTarget: jest.fn().mockResolvedValue(ok([])),
    findByFollowerAndTarget: jest.fn().mockResolvedValue(ok(null)),
    ...overrides,
  } as unknown as IFollowsRepository;
}

function makeService(deps?: {
  redis?: FakeRedis;
  upstream?: RecordingProfileService;
  follows?: IFollowsRepository;
}) {
  const redis = deps?.redis ?? new FakeRedis();
  const upstream = deps?.upstream ?? new RecordingProfileService();
  const follows = deps?.follows ?? makeFollowsRepo();
  const service = new CachedBlueskyProfileService(
    upstream,
    redis as any,
    follows,
  );
  return { service, redis, upstream, follows };
}

describe('CachedBlueskyProfileService.getProfiles', () => {
  it('cache miss: one upstream batch call, results cached and returned', async () => {
    const { service, redis, upstream } = makeService();
    upstream.profiles.set('did:plc:a', profile('did:plc:a'));
    upstream.profiles.set('did:plc:b', profile('did:plc:b'));

    const result = await service.getProfiles(['did:plc:a', 'did:plc:b']);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) expect(result.value.size).toBe(2);
    expect(upstream.batchCalls).toHaveLength(1);
    expect(upstream.batchCalls[0]).toEqual(
      expect.arrayContaining(['did:plc:a', 'did:plc:b']),
    );
    expect(redis.store.has('profile:did:plc:a')).toBe(true);
  });

  it('warm cache: one MGET, zero upstream calls', async () => {
    const { service, redis, upstream } = makeService();
    upstream.profiles.set('did:plc:a', profile('did:plc:a'));
    await service.getProfiles(['did:plc:a']);
    upstream.batchCalls.length = 0;
    redis.mgetCalls.length = 0;

    const result = await service.getProfiles(['did:plc:a']);

    expect(result.isOk()).toBe(true);
    expect(upstream.batchCalls).toHaveLength(0);
    expect(redis.mgetCalls).toHaveLength(1);
  });

  it('negative caching: unresolvable id is not re-fetched within TTL', async () => {
    const { service, upstream } = makeService();

    const first = await service.getProfiles(['did:plc:gone']);
    expect(first.isOk()).toBe(true);
    if (first.isOk()) expect(first.value.has('did:plc:gone')).toBe(false);
    expect(upstream.batchCalls).toHaveLength(1);

    const second = await service.getProfiles(['did:plc:gone']);
    expect(second.isOk()).toBe(true);
    if (second.isOk()) expect(second.value.has('did:plc:gone')).toBe(false);
    expect(upstream.batchCalls).toHaveLength(1); // no second upstream call
  });

  it('single-flight: concurrent requests for the same missing id share one fetch', async () => {
    const { service, upstream } = makeService();
    upstream.profiles.set('did:plc:a', profile('did:plc:a'));

    const [r1, r2] = await Promise.all([
      service.getProfiles(['did:plc:a']),
      service.getProfiles(['did:plc:a']),
    ]);

    expect(r1.isOk() && r2.isOk()).toBe(true);
    expect(upstream.batchCalls).toHaveLength(1);
  });

  it('stale-while-revalidate: stale entry served immediately, refreshed in background', async () => {
    const { service, redis, upstream } = makeService();
    upstream.profiles.set('did:plc:a', { ...profile('did:plc:a'), name: 'Fresh' });
    const thirteenHoursAgo = Date.now() - 13 * 3600 * 1000;
    redis.store.set('profile:did:plc:a', {
      value: JSON.stringify({
        v: 1,
        storedAt: thirteenHoursAgo,
        profile: { ...profile('did:plc:a'), name: 'Stale' },
      }),
      ttl: 259200,
    });

    const refreshDone = new Promise<void>((resolve) => {
      service.onBackgroundRefresh = () => resolve();
    });
    const result = await service.getProfiles(['did:plc:a']);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) expect(result.value.get('did:plc:a')!.name).toBe('Stale');

    await refreshDone;
    expect(upstream.batchCalls).toHaveLength(1);
    const cached = JSON.parse(redis.store.get('profile:did:plc:a')!.value);
    expect(cached.profile.name).toBe('Fresh');
  });

  it('legacy plain-profile cache values are read as fresh hits', async () => {
    const { service, redis, upstream } = makeService();
    redis.store.set('profile:did:plc:a', {
      value: JSON.stringify(profile('did:plc:a')), // no envelope
      ttl: 43200,
    });

    const result = await service.getProfiles(['did:plc:a']);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) expect(result.value.get('did:plc:a')!.name).toBe('Name did:plc:a');
    expect(upstream.batchCalls).toHaveLength(0);
  });

  it('batches follow status: one forward and one reverse query, fields set, self skipped', async () => {
    const follows = makeFollowsRepo({
      findByFollowerAndTargets: jest.fn().mockResolvedValue(
        ok([
          {
            targetId: 'did:plc:a',
            isSubscribed: true,
            subscriptionScopes: ['ALL'],
          },
        ]),
      ),
      findByFollowersAndTarget: jest.fn().mockResolvedValue(
        ok([{ followerId: { value: 'did:plc:b' } }]),
      ),
    });
    const { service, upstream } = makeService({ follows });
    for (const id of ['did:plc:a', 'did:plc:b', 'did:plc:caller']) {
      upstream.profiles.set(id, profile(id));
    }

    const result = await service.getProfiles(
      ['did:plc:a', 'did:plc:b', 'did:plc:caller'],
      'did:plc:caller',
    );

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const a = result.value.get('did:plc:a')!;
      expect(a.isFollowing).toBe(true);
      expect(a.isSubscribed).toBe(true);
      expect(a.followsYou).toBe(false);
      const b = result.value.get('did:plc:b')!;
      expect(b.isFollowing).toBe(false);
      expect(b.followsYou).toBe(true);
      const self = result.value.get('did:plc:caller')!;
      expect(self.isFollowing).toBeUndefined();
    }
    expect(follows.findByFollowerAndTargets).toHaveBeenCalledTimes(1);
    expect(follows.findByFollowersAndTarget).toHaveBeenCalledTimes(1);
  });

  it('never caches follow-status fields', async () => {
    const follows = makeFollowsRepo({
      findByFollowerAndTargets: jest
        .fn()
        .mockResolvedValue(ok([{ targetId: 'did:plc:a', isSubscribed: false }])),
    });
    const { service, redis, upstream } = makeService({ follows });
    upstream.profiles.set('did:plc:a', profile('did:plc:a'));

    await service.getProfiles(['did:plc:a'], 'did:plc:caller');

    const cached = JSON.parse(redis.store.get('profile:did:plc:a')!.value);
    expect(cached.profile.isFollowing).toBeUndefined();
    expect(cached.profile.followsYou).toBeUndefined();
  });

  it('falls back to direct upstream fetch when redis is down', async () => {
    const redis = new FakeRedis();
    redis.failMode = true;
    const { service, upstream } = makeService({ redis });
    upstream.profiles.set('did:plc:a', profile('did:plc:a'));

    const result = await service.getProfiles(['did:plc:a']);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) expect(result.value.has('did:plc:a')).toBe(true);
  });
});

describe('CachedBlueskyProfileService.getProfile (delegate)', () => {
  it('returns ok for a resolvable id and err for an unresolvable one', async () => {
    const { service, upstream } = makeService();
    upstream.profiles.set('did:plc:a', profile('did:plc:a'));

    const hit = await service.getProfile('did:plc:a');
    expect(hit.isOk()).toBe(true);
    if (hit.isOk()) expect(hit.value.id).toBe('did:plc:a');

    const miss = await service.getProfile('did:plc:gone');
    expect(miss.isErr()).toBe(true);
  });
});
