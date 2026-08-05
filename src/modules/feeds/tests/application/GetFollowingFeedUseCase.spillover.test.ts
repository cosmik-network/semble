import { Result, ok } from '../../../../shared/core/Result';
import { GetFollowingFeedUseCase } from '../../application/useCases/queries/GetFollowingFeedUseCase';
import { InMemoryFeedRepository } from '../infrastructure/InMemoryFeedRepository';
import { InMemoryFollowsRepository } from '../../../user/tests/infrastructure/InMemoryFollowsRepository';
import { FeedActivity } from '../../domain/FeedActivity';
import { CuratorId } from '../../../cards/domain/value-objects/CuratorId';
import { CardId } from '../../../cards/domain/value-objects/CardId';
import { UniqueEntityID } from '../../../../shared/domain/UniqueEntityID';
import { Follow } from '../../../user/domain/Follow';
import { DID } from '../../../user/domain/value-objects/DID';
import { FollowTargetType } from '../../../user/domain/value-objects/FollowTargetType';
import {
  IProfileService,
  UserProfile,
} from '../../../cards/domain/services/IProfileService';
import { UrlCardView } from '../../../cards/domain/ICardQueryRepository';
import { CardTypeEnum } from '../../../cards/domain/value-objects/CardType';

/**
 * Focused unit test for the following-feed → scoped-global spill-over behavior.
 *
 * Seeds N activities into the caller's fan-out following feed and M older
 * activities (authored by a followed DID) that were NEVER fanned out. Asserts
 * that paging drains the following feed first, then continues into the global
 * overflow, and that `hasMore` only goes false once both are drained.
 */
describe('GetFollowingFeedUseCase spill-over', () => {
  const CALLER = 'did:plc:caller';
  const FOLLOWED = 'did:plc:followed';

  let feedRepo: InMemoryFeedRepository;
  let followsRepo: InMemoryFollowsRepository;
  let useCase: GetFollowingFeedUseCase;

  // Minimal stub: every DID resolves to a valid profile so hydration succeeds.
  const profileService: IProfileService = {
    async getProfile(userId: string): Promise<Result<UserProfile>> {
      return ok({
        id: userId,
        name: 'Test User',
        handle: `${userId}.test`,
      });
    },
  };

  // Card query stub: returns a valid URL card view for any requested card id.
  const cardQueryRepository: any = {
    async getBatchUrlCardViews(
      cardIds: string[],
    ): Promise<Map<string, UrlCardView>> {
      const map = new Map<string, UrlCardView>();
      for (const id of cardIds) {
        map.set(id, {
          id,
          type: CardTypeEnum.URL,
          url: `https://example.com/${id}`,
          cardContent: { url: `https://example.com/${id}`, title: id },
          libraryCount: 0,
          urlLibraryCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          authorId: FOLLOWED,
        });
      }
      return map;
    },
    async getBatchUrlLibraryInfo(): Promise<Map<string, any>> {
      return new Map();
    },
  };

  // These activities never carry collections/connections, so these stubs are
  // called with empty inputs and just need to return ok([]).
  const collectionRepository: any = {
    async findByIds() {
      return ok([]);
    },
  };
  const connectionRepository: any = {
    async findByIds() {
      return ok([]);
    },
  };

  const actorId = () => CuratorId.create(FOLLOWED).unwrap();

  /** Create a CARD_COLLECTED activity authored by FOLLOWED at a fixed time. */
  function activityAt(seconds: number): FeedActivity {
    const cardId = CardId.createFromString(`card-${seconds}`).unwrap();
    return FeedActivity.createCardCollected(
      actorId(),
      cardId,
      undefined,
      undefined,
      undefined,
      new Date(2020, 0, 1, 0, 0, seconds),
    ).unwrap();
  }

  beforeEach(async () => {
    InMemoryFeedRepository.resetInstance();
    feedRepo = InMemoryFeedRepository.getInstance();
    feedRepo.clear();

    followsRepo = InMemoryFollowsRepository.getInstance();
    followsRepo.clear();

    // Caller follows FOLLOWED.
    const follow = Follow.create(
      {
        followerId: DID.create(CALLER).unwrap(),
        targetId: FOLLOWED,
        targetType: FollowTargetType.create('USER' as any).unwrap(),
        createdAt: new Date(2019, 0, 1),
      },
      new UniqueEntityID(`${CALLER}:${FOLLOWED}:USER`),
    ).unwrap();
    await followsRepo.save(follow);

    useCase = new GetFollowingFeedUseCase(
      feedRepo,
      profileService,
      cardQueryRepository,
      collectionRepository,
      connectionRepository,
      followsRepo,
    );
  });

  it('drains the following feed, then spills into the scoped global feed', async () => {
    // 2 fanned-out following activities (newest), 3 older global-only ones.
    const following = [activityAt(50), activityAt(49)];
    const globalOnly = [activityAt(30), activityAt(29), activityAt(28)];

    // Following activities: added globally AND fanned out to the caller.
    for (const a of following) {
      await feedRepo.addActivity(a);
      await feedRepo.fanOutActivityToFollowers(
        a.activityId,
        [CALLER],
        a.createdAt,
      );
    }
    // Global-only activities: added, but NOT fanned out to the caller.
    for (const a of globalOnly) {
      await feedRepo.addActivity(a);
    }

    // page 1, limit 2 → the two fanned-out following items; more remains.
    const p1 = (
      await useCase.execute({ callingUserId: CALLER, page: 1, limit: 2 })
    ).unwrap();
    expect(p1.activities.map((x) => x.id)).toEqual([
      following[0]!.activityId.getStringValue(),
      following[1]!.activityId.getStringValue(),
    ]);
    expect(p1.pagination.hasMore).toBe(true);

    // page 2, limit 2 → overflow: first two global-only items (newest first).
    const p2 = (
      await useCase.execute({ callingUserId: CALLER, page: 2, limit: 2 })
    ).unwrap();
    expect(p2.activities.map((x) => x.id)).toEqual([
      globalOnly[0]!.activityId.getStringValue(),
      globalOnly[1]!.activityId.getStringValue(),
    ]);
    expect(p2.pagination.hasMore).toBe(true);

    // page 3, limit 2 → last overflow item; nothing more.
    const p3 = (
      await useCase.execute({ callingUserId: CALLER, page: 3, limit: 2 })
    ).unwrap();
    expect(p3.activities.map((x) => x.id)).toEqual([
      globalOnly[2]!.activityId.getStringValue(),
    ]);
    expect(p3.pagination.hasMore).toBe(false);
  });

  it('stitches seamlessly (no short page, no duplicates) across the boundary', async () => {
    // 3 fanned-out following items, 2 older global-only. The scoped global feed
    // is the superset in one order: [50, 49, 48, 30, 29].
    const following = [activityAt(50), activityAt(49), activityAt(48)];
    const globalOnly = [activityAt(30), activityAt(29)];

    for (const a of following) {
      await feedRepo.addActivity(a);
      await feedRepo.fanOutActivityToFollowers(
        a.activityId,
        [CALLER],
        a.createdAt,
      );
    }
    for (const a of globalOnly) {
      await feedRepo.addActivity(a);
    }

    // page 1 (offset 0) is fully inside the fan-out feed: first two following items.
    const p1 = (
      await useCase.execute({ callingUserId: CALLER, page: 1, limit: 2 })
    ).unwrap();
    expect(p1.activities.map((x) => x.id)).toEqual([
      following[0]!.activityId.getStringValue(),
      following[1]!.activityId.getStringValue(),
    ]);
    expect(p1.pagination.hasMore).toBe(true);

    // page 2 (offset 2) reaches the boundary → served from the superset global
    // feed at the same offset: the last following item + first overflow item.
    // No short page, and no repeat of page 1's items.
    const p2 = (
      await useCase.execute({ callingUserId: CALLER, page: 2, limit: 2 })
    ).unwrap();
    expect(p2.activities.map((x) => x.id)).toEqual([
      following[2]!.activityId.getStringValue(),
      globalOnly[0]!.activityId.getStringValue(),
    ]);
    expect(p2.pagination.hasMore).toBe(true);

    // page 3 (offset 4): last overflow item; done.
    const p3 = (
      await useCase.execute({ callingUserId: CALLER, page: 3, limit: 2 })
    ).unwrap();
    expect(p3.activities.map((x) => x.id)).toEqual([
      globalOnly[1]!.activityId.getStringValue(),
    ]);
    expect(p3.pagination.hasMore).toBe(false);
  });

  it('behaves like the plain following feed when the caller follows nobody', async () => {
    followsRepo.clear(); // no follows

    const following = [activityAt(50), activityAt(49)];
    for (const a of following) {
      await feedRepo.addActivity(a);
      await feedRepo.fanOutActivityToFollowers(
        a.activityId,
        [CALLER],
        a.createdAt,
      );
    }
    // A global-only activity exists but must NOT appear (nobody followed).
    await feedRepo.addActivity(activityAt(30));

    const p1 = (
      await useCase.execute({ callingUserId: CALLER, page: 1, limit: 2 })
    ).unwrap();
    expect(p1.activities.map((x) => x.id)).toEqual([
      following[0]!.activityId.getStringValue(),
      following[1]!.activityId.getStringValue(),
    ]);
    expect(p1.pagination.hasMore).toBe(false);
  });
});
