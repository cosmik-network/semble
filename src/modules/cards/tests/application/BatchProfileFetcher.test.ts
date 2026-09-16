import { ok, err, Result } from 'src/shared/core/Result';
import { BatchProfileFetcher } from '../../application/services/BatchProfileFetcher';
import {
  IProfileService,
  UserProfile,
} from '../../domain/services/IProfileService';

class BatchOnlyProfileService implements IProfileService {
  singleCalls = 0;
  batchCalls: string[][] = [];
  profiles = new Map<string, UserProfile>();
  fail = false;

  async getProfile(userId: string): Promise<Result<UserProfile>> {
    this.singleCalls++;
    const profile = this.profiles.get(userId);
    return profile ? ok(profile) : err(new Error('not found'));
  }
  async getProfiles(
    userIds: string[],
  ): Promise<Result<Map<string, UserProfile>>> {
    if (this.fail) return err(new Error('total failure'));
    this.batchCalls.push([...userIds]);
    const map = new Map<string, UserProfile>();
    for (const id of userIds) {
      const profile = this.profiles.get(id);
      if (profile) map.set(id, profile);
    }
    return ok(map);
  }
}

const profile = (id: string): UserProfile => ({
  id,
  name: `Name ${id}`,
  handle: `${id}.test`,
});

describe('BatchProfileFetcher.fetchProfileMap', () => {
  it('makes exactly one batch call and never calls getProfile', async () => {
    const service = new BatchOnlyProfileService();
    service.profiles.set('a', profile('a'));
    service.profiles.set('b', profile('b'));
    const fetcher = new BatchProfileFetcher(service);

    const result = await fetcher.fetchProfileMap(['a', 'b', 'a']);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) expect(result.value.size).toBe(2);
    expect(service.batchCalls).toHaveLength(1);
    expect(service.batchCalls[0]).toEqual(['a', 'b']); // deduped
    expect(service.singleCalls).toBe(0);
  });

  it('errors on missing profiles when skipFailures=false', async () => {
    const service = new BatchOnlyProfileService();
    service.profiles.set('a', profile('a'));
    const fetcher = new BatchProfileFetcher(service);

    const result = await fetcher.fetchProfileMap(['a', 'gone']);
    expect(result.isErr()).toBe(true);
  });

  it('skips missing profiles when skipFailures=true', async () => {
    const service = new BatchOnlyProfileService();
    service.profiles.set('a', profile('a'));
    const fetcher = new BatchProfileFetcher(service);

    const result = await fetcher.fetchProfileMap(['a', 'gone'], undefined, {
      skipFailures: true,
    });
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.has('a')).toBe(true);
      expect(result.value.has('gone')).toBe(false);
    }
  });

  it('substitutes fallback profiles when skipFailures+includeFallback', async () => {
    const service = new BatchOnlyProfileService();
    service.profiles.set('a', profile('a'));
    const fetcher = new BatchProfileFetcher(service);

    const result = await fetcher.fetchProfileMap(['a', 'gone'], undefined, {
      skipFailures: true,
      includeFallback: true,
    });
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.has('gone')).toBe(true);
      expect(result.value.get('gone')!.id).toBe('gone');
    }
  });

  it('total failure: ok(empty) with skipFailures, err without', async () => {
    const service = new BatchOnlyProfileService();
    service.fail = true;
    const fetcher = new BatchProfileFetcher(service);

    const result = await fetcher.fetchProfileMap(['a'], undefined, {
      skipFailures: true,
    });
    // Total transport failure with skipFailures: empty map (all skipped).
    expect(result.isOk()).toBe(true);
    if (result.isOk()) expect(result.value.size).toBe(0);

    const strict = await fetcher.fetchProfileMap(['a']);
    expect(strict.isErr()).toBe(true);
  });
});
