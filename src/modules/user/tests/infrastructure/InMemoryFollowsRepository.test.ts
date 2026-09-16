import { InMemoryFollowsRepository } from './InMemoryFollowsRepository';
import { Follow } from '../../domain/Follow';
import { FollowTargetType } from '../../domain/value-objects/FollowTargetType';
import { DID } from 'src/modules/atproto/domain/DID';

function makeFollow(followerDid: string, targetId: string): Follow {
  const follower = DID.create(followerDid);
  const targetType = FollowTargetType.USER;
  if (follower.isErr()) throw new Error('bad fixture');
  const follow = Follow.create({
    followerId: follower.value,
    targetId,
    targetType,
    createdAt: new Date(),
    isSubscribed: false,
  });
  if (follow.isErr()) throw new Error('bad fixture');
  return follow.value;
}

describe('InMemoryFollowsRepository.findByFollowersAndTarget', () => {
  beforeEach(() => {
    const repo = InMemoryFollowsRepository.getInstance();
    (repo as any).clear();
  });

  it('returns only follows where a listed follower targets the given id', async () => {
    const repo = InMemoryFollowsRepository.getInstance();
    await repo.save(makeFollow('did:plc:alice', 'did:plc:caller'));
    await repo.save(makeFollow('did:plc:bob', 'did:plc:caller'));
    await repo.save(makeFollow('did:plc:carol', 'did:plc:other'));

    const result = await repo.findByFollowersAndTarget(
      ['did:plc:alice', 'did:plc:carol'],
      'did:plc:caller',
      FollowTargetType.USER,
    );

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toHaveLength(1);
      expect(result.value[0]!.followerId.value).toBe('did:plc:alice');
    }
  });

  it('returns empty array for empty follower list', async () => {
    const repo = InMemoryFollowsRepository.getInstance();
    const result = await repo.findByFollowersAndTarget(
      [],
      'did:plc:caller',
      FollowTargetType.USER,
    );
    expect(result.isOk()).toBe(true);
    if (result.isOk()) expect(result.value).toHaveLength(0);
  });
});
