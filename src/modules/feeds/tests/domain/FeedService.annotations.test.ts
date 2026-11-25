import { FeedService } from '../../domain/services/FeedService';
import { InMemoryFeedRepository } from '../infrastructure/InMemoryFeedRepository';
import { CuratorId } from '../../../cards/domain/value-objects/CuratorId';
import { CardId } from '../../../cards/domain/value-objects/CardId';
import { UserAnnotatedUrlMetadata } from '../../domain/FeedActivity';

const ACTOR = 'did:plc:actor';
const URL_A = 'https://example.com/page-a';
const URL_B = 'https://example.com/page-b';
const ANNOTATION_1 = '11111111-1111-4111-8111-111111111111';
const ANNOTATION_2 = '22222222-2222-4222-8222-222222222222';

function makeService() {
  const repository = InMemoryFeedRepository.getInstance();
  const lockService = {
    withLock: (_key: string, _ttl: number, fn: () => any) => fn(),
  } as any;
  return { service: new FeedService(repository, lockService), repository };
}

function annotationId(value: string) {
  return CardId.createFromString(value).unwrap();
}

describe('FeedService.addUserAnnotatedUrlActivity', () => {
  beforeEach(() => {
    InMemoryFeedRepository.resetInstance();
  });

  it('batches annotations by the same actor on the same url within the window', async () => {
    const { service, repository } = makeService();
    const actor = CuratorId.create(ACTOR).unwrap();

    await service.addUserAnnotatedUrlActivity(
      actor,
      URL_A,
      annotationId(ANNOTATION_1),
    );
    await service.addUserAnnotatedUrlActivity(
      actor,
      URL_A,
      annotationId(ANNOTATION_2),
    );

    const activities = repository.getAll();
    expect(activities).toHaveLength(1);
    expect(activities[0]!.userAnnotatedUrl).toBe(true);
    expect(activities[0]!.metadata).toEqual({
      url: URL_A,
      annotationIds: [ANNOTATION_1, ANNOTATION_2],
    });
  });

  it('is idempotent when the same annotation is re-delivered', async () => {
    const { service, repository } = makeService();
    const actor = CuratorId.create(ACTOR).unwrap();

    await service.addUserAnnotatedUrlActivity(
      actor,
      URL_A,
      annotationId(ANNOTATION_1),
    );
    await service.addUserAnnotatedUrlActivity(
      actor,
      URL_A,
      annotationId(ANNOTATION_1),
    );

    const activities = repository.getAll();
    expect(activities).toHaveLength(1);
    expect(
      (activities[0]!.metadata as UserAnnotatedUrlMetadata).annotationIds,
    ).toEqual([ANNOTATION_1]);
  });

  it('creates a separate batch per url', async () => {
    const { service, repository } = makeService();
    const actor = CuratorId.create(ACTOR).unwrap();

    await service.addUserAnnotatedUrlActivity(
      actor,
      URL_A,
      annotationId(ANNOTATION_1),
    );
    await service.addUserAnnotatedUrlActivity(
      actor,
      URL_B,
      annotationId(ANNOTATION_2),
    );

    const activities = repository.getAll();
    expect(activities).toHaveLength(2);
    const urls = activities.map(
      (activity) => (activity.metadata as UserAnnotatedUrlMetadata).url,
    );
    expect(urls).toEqual(expect.arrayContaining([URL_A, URL_B]));
  });

  it('starts a new batch once the window has elapsed', async () => {
    const { service, repository } = makeService();
    const actor = CuratorId.create(ACTOR).unwrap();

    // First batch is seeded with an old timestamp, outside the window
    await service.addUserAnnotatedUrlActivity(
      actor,
      URL_A,
      annotationId(ANNOTATION_1),
      undefined,
      20 * 60 * 1000,
      new Date(Date.now() - 30 * 60 * 1000),
    );
    await service.addUserAnnotatedUrlActivity(
      actor,
      URL_A,
      annotationId(ANNOTATION_2),
    );

    const activities = repository.getAll();
    expect(activities).toHaveLength(2);
  });
});
