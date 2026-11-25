import { GetGlobalFeedUseCase } from '../../application/useCases/queries/GetGlobalFeedUseCase';
import { InMemoryFeedRepository } from '../infrastructure/InMemoryFeedRepository';
import { FeedActivity } from '../../domain/FeedActivity';
import { CuratorId } from '../../../cards/domain/value-objects/CuratorId';
import { CardId } from '../../../cards/domain/value-objects/CardId';
import { CollectionId } from '../../../cards/domain/value-objects/CollectionId';
import { FakeProfileService } from '../../../cards/tests/utils/FakeProfileService';
import { UserProfile } from '../../../cards/domain/services/IProfileService';
import { AnnotationCardView } from '../../../cards/domain/ICardQueryRepository';
import { ok } from '../../../../shared/core/Result';

const ACTOR = 'did:plc:actor';
const AUTHOR = 'did:plc:author';
const URL = 'https://example.com/page';
const ANNOTATION_1 = '11111111-1111-4111-8111-111111111111';
const ANNOTATION_2 = '22222222-2222-4222-8222-222222222222';
const COLLECTION_ID = '44444444-4444-4444-8444-444444444444';
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
    url: URL,
    libraryCount: 2,
    selectors: [{ type: 'TextQuoteSelector', exact: PASSAGE }],
    note: 'a note',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-02T00:00:00Z'),
    authorId: AUTHOR,
    ...overrides,
  };
}

function makeUseCase(views: Map<string, AnnotationCardView>) {
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
    { findByIds: jest.fn(async () => ok([])) } as any,
    { checkFollowingMultiple: jest.fn(async () => ok(new Map())) } as any,
  );

  return { useCase, repository };
}

describe('GetGlobalFeedUseCase annotation activities', () => {
  beforeEach(() => {
    InMemoryFeedRepository.resetInstance();
  });

  it('hydrates USER_ANNOTATED_URL batches with all annotation cards', async () => {
    const { useCase, repository } = makeUseCase(
      new Map([
        [ANNOTATION_1, makeAnnotationView(ANNOTATION_1)],
        [ANNOTATION_2, makeAnnotationView(ANNOTATION_2, { note: undefined })],
      ]),
    );

    const activity = FeedActivity.createUserAnnotatedUrl(
      CuratorId.create(ACTOR).unwrap(),
      URL,
      [
        CardId.createFromString(ANNOTATION_1).unwrap(),
        CardId.createFromString(ANNOTATION_2).unwrap(),
      ],
    ).unwrap();
    await repository.addActivity(activity);

    const result = await useCase.execute({ page: 1, limit: 20 });
    expect(result.isOk()).toBe(true);

    const items = result.unwrap().activities;
    expect(items).toHaveLength(1);
    const item = items[0] as any;
    expect(item.activityType).toBe('USER_ANNOTATED_URL');
    expect(item.url).toBe(URL);
    expect(item.annotations).toHaveLength(2);
    expect(item.annotations[0].type).toBe('ANNOTATION');
    expect(item.annotations[0].selectors).toEqual([
      { type: 'TextQuoteSelector', exact: PASSAGE },
    ]);
    expect(item.annotations[0].note).toBe('a note');
    expect(item.annotations[0].author.handle).toBe('author');
    expect(item.annotations[1].note).toBeUndefined();
  });

  it('renders a collected annotation card as an annotation, not a URL card', async () => {
    const { useCase, repository } = makeUseCase(
      new Map([[ANNOTATION_1, makeAnnotationView(ANNOTATION_1)]]),
    );

    const activity = FeedActivity.createCardCollected(
      CuratorId.create(ACTOR).unwrap(),
      CardId.createFromString(ANNOTATION_1).unwrap(),
      [CollectionId.createFromString(COLLECTION_ID).unwrap()],
    ).unwrap();
    await repository.addActivity(activity);

    const result = await useCase.execute({ page: 1, limit: 20 });
    expect(result.isOk()).toBe(true);

    const items = result.unwrap().activities;
    expect(items).toHaveLength(1);
    const item = items[0] as any;
    expect(item.activityType).toBe('CARD_COLLECTED');
    expect(item.card.type).toBe('ANNOTATION');
    expect(item.card.selectors).toEqual([
      { type: 'TextQuoteSelector', exact: PASSAGE },
    ]);
  });

  it('skips annotation ids that no longer resolve', async () => {
    const { useCase, repository } = makeUseCase(new Map());

    const activity = FeedActivity.createUserAnnotatedUrl(
      CuratorId.create(ACTOR).unwrap(),
      URL,
      [CardId.createFromString(ANNOTATION_1).unwrap()],
    ).unwrap();
    await repository.addActivity(activity);

    const result = await useCase.execute({ page: 1, limit: 20 });
    expect(result.isOk()).toBe(true);
    expect(result.unwrap().activities).toHaveLength(0);
  });
});
