import { AddActivityToFeedUseCase } from '../../application/useCases/commands/AddActivityToFeedUseCase';
import { FeedService } from '../../domain/services/FeedService';
import { InMemoryFeedRepository } from '../infrastructure/InMemoryFeedRepository';
import {
  CardCollectedMetadata,
  UserAnnotatedUrlMetadata,
} from '../../domain/FeedActivity';
import { CuratorId } from '../../../cards/domain/value-objects/CuratorId';
import { ok } from '../../../../shared/core/Result';

const ACTOR = 'did:plc:actor';
const URL = 'https://example.com/page';
const CARD_ID = '33333333-3333-4333-8333-333333333333';
const COLLECTION_ID = '44444444-4444-4444-8444-444444444444';

function makeAnnotationCard(overrides: Record<string, unknown> = {}) {
  return {
    isAnnotationCard: true,
    isUrlCard: false,
    viaCardId: undefined,
    url: { value: URL },
    // Recent, so the created activity lands inside the batching window
    createdAt: new Date(),
    getLibraryInfo: () => undefined,
    ...overrides,
  } as any;
}

function makeUrlCard() {
  return {
    isAnnotationCard: false,
    isUrlCard: true,
    viaCardId: undefined,
    url: { value: URL },
    content: {},
    createdAt: new Date('2026-01-01T00:00:00Z'),
    getLibraryInfo: () => undefined,
  } as any;
}

function makeUseCase(card: any) {
  const repository = InMemoryFeedRepository.getInstance();
  const lockService = {
    withLock: (_key: string, _ttl: number, fn: () => any) => fn(),
  } as any;
  const feedService = new FeedService(repository, lockService);
  const useCase = new AddActivityToFeedUseCase(
    feedService,
    { findById: jest.fn(async () => ok(card)) } as any,
    {
      getFollowers: jest.fn(async () => ok([])),
      getFollowersOfCollections: jest.fn(async () => ok([])),
    } as any,
    repository,
  );
  return { useCase, repository };
}

describe('AddActivityToFeedUseCase annotation routing', () => {
  beforeEach(() => {
    InMemoryFeedRepository.resetInstance();
  });

  it('routes a library-only annotation add to a batched USER_ANNOTATED_URL activity', async () => {
    const { useCase, repository } = makeUseCase(makeAnnotationCard());

    const result = await useCase.execute({
      type: 'CARD_COLLECTED' as any,
      actorId: ACTOR,
      cardId: CARD_ID,
      collectionIds: undefined,
    });
    expect(result.isOk()).toBe(true);

    const activities = repository.getAll();
    expect(activities).toHaveLength(1);
    expect(activities[0]!.userAnnotatedUrl).toBe(true);
    expect(activities[0]!.metadata).toEqual({
      url: URL,
      annotationIds: [CARD_ID],
    });
  });

  it('keeps CARD_COLLECTED when the annotation is added to a collection', async () => {
    const { useCase, repository } = makeUseCase(makeAnnotationCard());

    const result = await useCase.execute({
      type: 'CARD_COLLECTED' as any,
      actorId: ACTOR,
      cardId: CARD_ID,
      collectionIds: [COLLECTION_ID],
    });
    expect(result.isOk()).toBe(true);

    const activities = repository.getAll();
    expect(activities).toHaveLength(1);
    expect(activities[0]!.cardCollected).toBe(true);
    expect(activities[0]!.metadata as CardCollectedMetadata).toEqual({
      cardId: CARD_ID,
      collectionIds: [COLLECTION_ID],
    });
  });

  it('keeps CARD_COLLECTED for via-card annotation saves', async () => {
    const { useCase, repository } = makeUseCase(
      makeAnnotationCard({
        viaCardId: { getStringValue: () => 'via-card' },
      }),
    );

    await useCase.execute({
      type: 'CARD_COLLECTED' as any,
      actorId: ACTOR,
      cardId: CARD_ID,
      collectionIds: undefined,
    });

    const activities = repository.getAll();
    expect(activities).toHaveLength(1);
    expect(activities[0]!.cardCollected).toBe(true);
  });

  it('keeps CARD_COLLECTED for URL cards', async () => {
    const { useCase, repository } = makeUseCase(makeUrlCard());

    await useCase.execute({
      type: 'CARD_COLLECTED' as any,
      actorId: ACTOR,
      cardId: CARD_ID,
      collectionIds: undefined,
    });

    const activities = repository.getAll();
    expect(activities).toHaveLength(1);
    expect(activities[0]!.cardCollected).toBe(true);
    expect(
      (activities[0]!.metadata as UserAnnotatedUrlMetadata).url,
    ).toBeUndefined();
  });

  it('appends to an existing USER_ANNOTATED_URL batch within the window', async () => {
    const { useCase, repository } = makeUseCase(makeAnnotationCard());

    const secondAnnotationId = '55555555-5555-4555-8555-555555555555';
    await useCase.execute({
      type: 'CARD_COLLECTED' as any,
      actorId: ACTOR,
      cardId: CARD_ID,
      collectionIds: undefined,
    });
    await useCase.execute({
      type: 'CARD_COLLECTED' as any,
      actorId: ACTOR,
      cardId: secondAnnotationId,
      collectionIds: undefined,
    });

    const activities = repository.getAll();
    expect(activities).toHaveLength(1);
    expect(activities[0]!.metadata).toEqual({
      url: URL,
      annotationIds: [CARD_ID, secondAnnotationId],
    });
  });
});
