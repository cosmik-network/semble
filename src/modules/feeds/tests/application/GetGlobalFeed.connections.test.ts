import { computeAnnotationCID } from '@semble/types';
import { GetGlobalFeedUseCase } from '../../application/useCases/queries/GetGlobalFeedUseCase';
import { InMemoryFeedRepository } from '../infrastructure/InMemoryFeedRepository';
import { FeedActivity } from '../../domain/FeedActivity';
import { CuratorId } from '../../../cards/domain/value-objects/CuratorId';
import { ConnectionId } from '../../../cards/domain/value-objects/ConnectionId';
import { CardId } from '../../../cards/domain/value-objects/CardId';
import { URL } from '../../../cards/domain/value-objects/URL';
import { UrlOrCardId } from '../../../cards/domain/value-objects/UrlOrCardId';
import { Connection } from '../../../cards/domain/Connection';
import { UniqueEntityID } from '../../../../shared/domain/UniqueEntityID';
import { FakeProfileService } from '../../../cards/tests/utils/FakeProfileService';
import { UserProfile } from '../../../cards/domain/services/IProfileService';
import { AnnotationCardView } from '../../../cards/domain/ICardQueryRepository';
import { ok } from '../../../../shared/core/Result';

const ACTOR = 'did:plc:actor';
const AUTHOR = 'did:plc:author';
const PAGE_URL = 'https://example.com/page';
const OTHER_URL = 'https://other.com/article';
const ANNOTATION_ID = '11111111-1111-4111-8111-111111111111';
const CONNECTION_ID = '33333333-3333-4333-8333-333333333333';
const PASSAGE = 'the exact quoted passage';

function makeProfile(id: string, handle: string): UserProfile {
  return {
    id,
    handle,
    name: `User ${handle}`,
  };
}

function makeAnnotationView(
  cardId: string,
  overrides: Partial<AnnotationCardView> = {},
): AnnotationCardView {
  return {
    id: cardId,
    type: 'ANNOTATION' as any,
    url: PAGE_URL,
    cid: computeAnnotationCID(PAGE_URL, PASSAGE),
    libraryCount: 2,
    selectors: [{ type: 'TextQuoteSelector', exact: PASSAGE }],
    note: 'a note',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-02T00:00:00Z'),
    authorId: AUTHOR,
    ...overrides,
  };
}

// A connection with an annotation-card source and a URL target
function makeAnnotationConnection() {
  return Connection.reconstitute(
    {
      source: UrlOrCardId.createFromCard(
        CardId.createFromString(ANNOTATION_ID).unwrap(),
      ).unwrap(),
      target: UrlOrCardId.createFromUrl(
        URL.create(OTHER_URL).unwrap(),
      ).unwrap(),
      curatorId: CuratorId.create(ACTOR).unwrap(),
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-02T00:00:00Z'),
    },
    new UniqueEntityID(CONNECTION_ID),
  ).unwrap();
}

function makeUseCase(
  views: Map<string, AnnotationCardView>,
  connections: Connection[],
) {
  const repository = InMemoryFeedRepository.getInstance();

  const profileService = new FakeProfileService();
  profileService.addProfile(makeProfile(ACTOR, 'actor'));
  profileService.addProfile(makeProfile(AUTHOR, 'author'));

  const useCase = new GetGlobalFeedUseCase(
    repository,
    profileService as any,
    {
      getBatchUrlCardViews: jest.fn(async () => new Map()),
      getBatchAnnotationCardViews: jest.fn(async (cardIds: string[]) => {
        const map = new Map<string, AnnotationCardView>();
        for (const cardId of cardIds) {
          const view = views.get(cardId);
          if (view) map.set(cardId, view);
        }
        return map;
      }),
      getBatchUrlLibraryInfo: jest.fn(async () => new Map()),
    } as any,
    { findByIds: jest.fn(async () => ok([])) } as any,
    { findByIds: jest.fn(async () => ok(connections)) } as any,
    { checkFollowingMultiple: jest.fn(async () => ok(new Map())) } as any,
  );

  return { useCase, repository };
}

async function addConnectionCreatedActivity(
  repository: InMemoryFeedRepository,
) {
  const activity = FeedActivity.createConnectionCreated(
    CuratorId.create(ACTOR).unwrap(),
    ConnectionId.createFromString(CONNECTION_ID).unwrap(),
  ).unwrap();
  await repository.addActivity(activity);
}

describe('GetGlobalFeedUseCase connection activities', () => {
  beforeEach(() => {
    InMemoryFeedRepository.resetInstance();
  });

  it('hydrates a CARD endpoint as the annotation card', async () => {
    const { useCase, repository } = makeUseCase(
      new Map([[ANNOTATION_ID, makeAnnotationView(ANNOTATION_ID)]]),
      [makeAnnotationConnection()],
    );
    await addConnectionCreatedActivity(repository);

    const result = await useCase.execute({ page: 1, limit: 20 });
    expect(result.isOk()).toBe(true);

    const items = result.unwrap().activities;
    expect(items).toHaveLength(1);
    const item = items[0] as any;
    expect(item.activityType).toBe('CONNECTION_CREATED');
    expect(item.connection.source.type).toBe('CARD');
    expect(item.connection.source.card.id).toBe(ANNOTATION_ID);
    expect(item.connection.source.card.selectors).toEqual([
      { type: 'TextQuoteSelector', exact: PASSAGE },
    ]);
    expect(item.connection.source.card.author.handle).toBe('author');
    expect(item.connection.target.type).toBe('URL');
    expect(item.connection.target.url).toBe(OTHER_URL);
    expect(item.connection.connection.curator.handle).toBe('actor');
  });

  it('skips the activity when a CARD endpoint cannot be resolved', async () => {
    const { useCase, repository } = makeUseCase(
      new Map(), // no annotation views — the card was deleted
      [makeAnnotationConnection()],
    );
    await addConnectionCreatedActivity(repository);

    const result = await useCase.execute({ page: 1, limit: 20 });
    expect(result.isOk()).toBe(true);
    expect(result.unwrap().activities).toHaveLength(0);
  });
});
