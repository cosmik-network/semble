import { OnboardingStatsComposer } from '../../application/OnboardingStatsComposer';
import {
  IProductAnalyticsQueryRepository,
  OnboardingStatsRaw,
} from '../../domain/IProductAnalyticsQueryRepository';
import { BatchProfileFetcher } from '../../../cards/application/services/BatchProfileFetcher';
import { FakeProfileService } from '../../../cards/tests/utils/FakeProfileService';
import { InMemoryCollectionRepository } from '../../../cards/tests/utils/InMemoryCollectionRepository';
import { InMemoryConnectionRepository } from '../../../cards/tests/utils/InMemoryConnectionRepository';
import { CollectionBuilder } from '../../../cards/tests/utils/builders/CollectionBuilder';
import { Collection } from '../../../cards/domain/Collection';
import { UniqueEntityID } from '../../../../shared/domain/UniqueEntityID';

const DID_A = 'did:plc:cohortuser';
const DID_B = 'did:plc:suggested';
const DID_AUTHOR = 'did:plc:collectionauthor';
const COLLECTION_UUID = '22222222-2222-4222-8222-222222222222';

function emptyDim() {
  return {
    totalUserCount: 0,
    weeklyUserCount: 0,
    weeklyUserIds: [] as string[],
    stats: [],
  };
}

function emptyCounts() {
  return {
    totalUserCount: 0,
    weeklyUserCount: 0,
    weeklyUserIds: [] as string[],
  };
}

function makeRawFixture(): OnboardingStatsRaw {
  return {
    cohortWeekStart: '2026-08-10T00:00:00.000Z',
    totalNewUserCount: 3,
    weeklyNewUsersCount: 1,
    onboardingState: [
      {
        state: 'COMPLETED',
        totalUserCount: 1,
        weeklyUserCount: 1,
        weeklyUserIds: [DID_A],
      },
    ],
    dimensions: {
      topicsSelected: {
        totalUserCount: 2,
        weeklyUserCount: 1,
        weeklyUserIds: [DID_A],
        stats: [
          {
            value: 'ai',
            totalUserCount: 2,
            weeklyUserCount: 1,
            weeklyUserIds: [DID_A],
          },
        ],
      },
      linksSuggested: emptyDim(),
      linksSelected: emptyDim(),
      suggestedAccounts: {
        totalUserCount: 1,
        weeklyUserCount: 1,
        weeklyUserIds: [DID_A],
        stats: [
          {
            value: DID_B,
            totalUserCount: 1,
            weeklyUserCount: 1,
            weeklyUserIds: [DID_A],
          },
          {
            value: 'garbage-not-a-did',
            totalUserCount: 1,
            weeklyUserCount: 1,
            weeklyUserIds: [DID_A],
          },
        ],
      },
      suggestedCollections: emptyDim(),
      followedAccounts: emptyDim(),
      followedCollections: {
        totalUserCount: 1,
        weeklyUserCount: 1,
        weeklyUserIds: [DID_A],
        stats: [
          {
            value: COLLECTION_UUID,
            totalUserCount: 1,
            weeklyUserCount: 1,
            weeklyUserIds: [DID_A],
          },
          {
            value: 'not-a-uuid',
            totalUserCount: 1,
            weeklyUserCount: 1,
            weeklyUserIds: [DID_A],
          },
        ],
      },
      firstCards: emptyDim(),
      intention: emptyDim(),
      referralSource: emptyDim(),
    },
    firstCollection: {
      totalUserCount: 1,
      weeklyUserCount: 1,
      weeklyUserIds: [DID_A],
      weeklyValues: [{ userId: DID_A, value: COLLECTION_UUID }],
    },
    firstConnection: {
      totalUserCount: 1,
      weeklyUserCount: 1,
      weeklyUserIds: [DID_A],
      weeklyValues: [{ userId: DID_A, value: 'bad-connection-id' }],
    },
    milestones: {
      pwaClicked: {
        totalUserCount: 1,
        weeklyUserCount: 1,
        weeklyUserIds: [DID_A],
      },
      iosShortcutClicked: emptyCounts(),
      browserExtensionClicked: emptyCounts(),
      mcpClicked: emptyCounts(),
      saveModalGuideCompleted: emptyCounts(),
      connectionCreationModalCompleted: emptyCounts(),
      semblePageNavigationCompleted: emptyCounts(),
    },
  };
}

class StubQueryRepository implements IProductAnalyticsQueryRepository {
  constructor(private raw: OnboardingStatsRaw) {}
  getWacStats(): never {
    throw new Error('not used');
  }
  getApiUsageStats(): never {
    throw new Error('not used');
  }
  getActivationFunnelStats(): never {
    throw new Error('not used');
  }
  getRetentionStats(): never {
    throw new Error('not used');
  }
  getRetentionSegmentsStats(): never {
    throw new Error('not used');
  }
  async getOnboardingWeeklyStatsRaw(): Promise<OnboardingStatsRaw> {
    return this.raw;
  }
  async getOnboardingSummaryStatsRaw(): Promise<OnboardingStatsRaw> {
    return this.raw;
  }
}

/** Wraps FakeProfileService to count getProfile invocations per user id. */
class CountingProfileService extends FakeProfileService {
  public callCounts = new Map<string, number>();

  override async getProfile(userId: string) {
    this.callCounts.set(userId, (this.callCounts.get(userId) ?? 0) + 1);
    return super.getProfile(userId);
  }
}

describe('OnboardingStatsComposer', () => {
  let profileService: CountingProfileService;
  let collectionRepository: InMemoryCollectionRepository;
  let connectionRepository: InMemoryConnectionRepository;
  let composer: OnboardingStatsComposer;

  beforeEach(async () => {
    profileService = new CountingProfileService();
    profileService.addProfile({
      id: DID_A,
      name: 'Cohort User',
      handle: 'cohort.test',
      avatarUrl: 'https://cdn.example/a.png',
    });
    profileService.addProfile({
      id: DID_B,
      name: 'Suggested User',
      handle: 'suggested.test',
    });
    profileService.addProfile({
      id: DID_AUTHOR,
      name: 'Collection Author',
      handle: 'author.test',
    });

    collectionRepository = InMemoryCollectionRepository.getInstance();
    collectionRepository.clear();
    connectionRepository = InMemoryConnectionRepository.getInstance();
    connectionRepository.clear();

    const collection = new CollectionBuilder()
      .withId(new UniqueEntityID(COLLECTION_UUID))
      .withAuthorId(DID_AUTHOR)
      .withName('Starter Pack')
      .build();
    if (collection instanceof Error) throw collection;
    await collectionRepository.create(collection as Collection);

    composer = new OnboardingStatsComposer(
      new StubQueryRepository(makeRawFixture()),
      new BatchProfileFetcher(profileService),
      collectionRepository,
      connectionRepository,
    );
  });

  it('hydrates weekly user ids into minimal profiles', async () => {
    const result = await composer.getWeeklyStats({});

    expect(result.topicsSelected.weeklyUsers).toEqual([
      {
        id: DID_A,
        name: 'Cohort User',
        handle: 'cohort.test',
        avatarUrl: 'https://cdn.example/a.png',
        bannerUrl: undefined,
      },
    ]);
    expect(result.topicsSelected.stats[0]).toMatchObject({
      topic: 'ai',
      totalUserCount: 2,
      weeklyUserCount: 1,
    });
    expect(result.pwaClicked.weeklyUsers.map((u) => u.id)).toEqual([DID_A]);
  });

  it('hydrates account values to profiles and falls back for non-DIDs', async () => {
    const result = await composer.getWeeklyStats({});

    const [suggested, garbage] = result.suggestedAccounts.stats;
    expect(suggested!.user).toMatchObject({
      id: DID_B,
      name: 'Suggested User',
    });
    // Non-DID value never hits the profile service, gets a fallback stub
    expect(garbage!.user).toMatchObject({
      id: 'garbage-not-a-did',
      name: 'Unknown User',
    });
    expect(garbage!.totalUserCount).toBe(1); // counts preserved
    expect(profileService.callCounts.has('garbage-not-a-did')).toBe(false);
  });

  it('hydrates valid collection UUIDs and stubs malformed ones, keeping counts', async () => {
    const result = await composer.getWeeklyStats({});

    const [valid, malformed] = result.followedCollections.stats;
    expect(valid!.collection).toMatchObject({
      id: COLLECTION_UUID,
      name: 'Starter Pack',
      author: expect.objectContaining({
        id: DID_AUTHOR,
        name: 'Collection Author',
      }),
    });
    expect(malformed!.collection).toEqual({ id: 'not-a-uuid' });
    expect(malformed!.totalUserCount).toBe(1);
  });

  it('hydrates first collection with creator and stubs unresolvable first connection', async () => {
    const result = await composer.getWeeklyStats({});

    expect(result.firstCollections.stats).toHaveLength(1);
    expect(result.firstCollections.stats[0]!.collection.name).toBe(
      'Starter Pack',
    );
    expect(result.firstCollections.stats[0]!.creator).toMatchObject({
      id: DID_AUTHOR,
    });

    expect(result.firstConnection.stats[0]!.connection).toEqual({
      id: 'bad-connection-id',
    });
    expect(result.firstConnection.stats[0]!.creator).toBeUndefined();
  });

  it('fetches each unique DID exactly once', async () => {
    await composer.getWeeklyStats({});

    // DID_A appears in many weeklyUserIds arrays but is fetched once
    expect(profileService.callCounts.get(DID_A)).toBe(1);
    expect(profileService.callCounts.get(DID_B)).toBe(1);
    expect(profileService.callCounts.get(DID_AUTHOR)).toBe(1);
  });

  it('produces totals-only summary stats with hydrated ranked values', async () => {
    const result = await composer.getSummaryStats();

    expect(result.totalNewUserCount).toBe(3);
    expect(result.topicsSelected.totalUserCount).toBe(2);
    expect(result.topicsSelected.stats[0]).toEqual({
      topic: 'ai',
      totalUserCount: 2,
    });
    expect(result.followedCollections.stats[0]).toMatchObject({
      collection: expect.objectContaining({ name: 'Starter Pack' }),
      totalUserCount: 1,
    });
    expect(result.firstCollections).toEqual({ totalUserCount: 1 });
    expect(result.pwaClicked).toEqual({ totalUserCount: 1 });
  });
});
