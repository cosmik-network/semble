import { GetAnnotationStatusForMyLibraryUseCase } from '../../application/useCases/queries/GetAnnotationStatusForMyLibraryUseCase';
import { InMemoryCardRepository } from '../utils/InMemoryCardRepository';
import { InMemoryCardQueryRepository } from '../utils/InMemoryCardQueryRepository';
import { InMemoryCollectionRepository } from '../utils/InMemoryCollectionRepository';
import { InMemoryCollectionQueryRepository } from '../utils/InMemoryCollectionQueryRepository';
import { InMemoryConnectionRepository } from '../utils/InMemoryConnectionRepository';
import { FakeEventPublisher } from '../utils/FakeEventPublisher';
import { FakeProfileService } from '../utils/FakeProfileService';
import { CuratorId } from '../../domain/value-objects/CuratorId';
import { CardBuilder } from '../utils/builders/CardBuilder';
import { CollectionBuilder } from '../utils/builders/CollectionBuilder';
import { CardId } from '../../domain/value-objects/CardId';
import { URL } from '../../domain/value-objects/URL';
import { InMemoryFollowsRepository } from '../../../user/tests/infrastructure/InMemoryFollowsRepository';

describe('GetAnnotationStatusForMyLibraryUseCase', () => {
  const TEST_URL = 'https://example.com/annotated-article';
  const PASSAGE = 'the quoted passage';

  let useCase: GetAnnotationStatusForMyLibraryUseCase;
  let cardRepository: InMemoryCardRepository;
  let cardQueryRepository: InMemoryCardQueryRepository;
  let collectionRepository: InMemoryCollectionRepository;
  let collectionQueryRepository: InMemoryCollectionQueryRepository;
  let connectionRepository: InMemoryConnectionRepository;
  let eventPublisher: FakeEventPublisher;
  let profileService: FakeProfileService;
  let followsRepository: InMemoryFollowsRepository;
  let curatorId: CuratorId;
  let otherCuratorId: CuratorId;

  const createAnnotationCard = async (
    curator: CuratorId,
    props: { exact?: string; note?: string } = {},
  ): Promise<string> => {
    const card = new CardBuilder()
      .withCuratorId(curator.value)
      .withAnnotationCard(
        URL.create(TEST_URL).unwrap(),
        [{ exact: props.exact ?? PASSAGE }],
        props.note,
      )
      .build();
    if (card instanceof Error) {
      throw new Error(`Failed to create card: ${card.message}`);
    }
    card.addToLibrary(curator);
    await cardRepository.save(card);
    return card.cardId.getStringValue();
  };

  beforeEach(() => {
    cardRepository = InMemoryCardRepository.getInstance();
    collectionRepository = InMemoryCollectionRepository.getInstance();
    connectionRepository = InMemoryConnectionRepository.getInstance();
    cardQueryRepository = new InMemoryCardQueryRepository(
      cardRepository,
      collectionRepository,
      connectionRepository,
    );
    collectionQueryRepository = new InMemoryCollectionQueryRepository(
      collectionRepository,
      cardRepository,
    );
    eventPublisher = new FakeEventPublisher();
    profileService = new FakeProfileService();
    followsRepository = InMemoryFollowsRepository.getInstance();

    useCase = new GetAnnotationStatusForMyLibraryUseCase(
      cardRepository,
      cardQueryRepository,
      collectionQueryRepository,
      profileService,
      followsRepository,
      eventPublisher,
    );

    curatorId = CuratorId.create('did:plc:testcurator').unwrap();
    otherCuratorId = CuratorId.create('did:plc:othercurator').unwrap();

    profileService.addProfile({
      id: curatorId.value,
      name: 'Test Curator',
      handle: 'testcurator',
    });
    profileService.addProfile({
      id: otherCuratorId.value,
      name: 'Other Curator',
      handle: 'othercurator',
    });
  });

  afterEach(() => {
    cardRepository.clear();
    collectionRepository.clear();
    connectionRepository.clear();
    collectionQueryRepository.clear();
    eventPublisher.clear();
    profileService.clear();
    followsRepository.clear();
  });

  it('returns the card and its collections when the passage is saved', async () => {
    const cardId = await createAnnotationCard(curatorId, { note: 'mine' });

    const collection = new CollectionBuilder()
      .withAuthorId(curatorId.value)
      .withName('Best Passages')
      .build();
    if (collection instanceof Error) {
      throw new Error('Failed to create collection');
    }
    collection.addCard(CardId.createFromString(cardId).unwrap(), curatorId);
    await collectionRepository.save(collection);

    const result = await useCase.execute({
      url: TEST_URL,
      exact: PASSAGE,
      curatorId: curatorId.value,
    });

    expect(result.isOk()).toBe(true);
    const response = result.unwrap();
    expect(response.card).toBeDefined();
    expect(response.card?.id).toBe(cardId);
    expect(response.card?.type).toBe('ANNOTATION');
    expect(response.card?.note).toBe('mine');
    expect(response.card?.selectors[0]?.exact).toBe(PASSAGE);
    expect(response.collections).toHaveLength(1);
    expect(response.collections?.[0]?.name).toBe('Best Passages');
  });

  it('returns empty collections when the card is in no collections', async () => {
    await createAnnotationCard(curatorId);

    const result = await useCase.execute({
      url: TEST_URL,
      exact: PASSAGE,
      curatorId: curatorId.value,
    });

    expect(result.isOk()).toBe(true);
    expect(result.unwrap().card).toBeDefined();
    expect(result.unwrap().collections).toHaveLength(0);
  });

  it('matches on normalized exact text', async () => {
    await createAnnotationCard(curatorId, { note: 'whitespace note' });

    const result = await useCase.execute({
      url: TEST_URL,
      exact: `the  quoted   passage`,
      curatorId: curatorId.value,
    });

    expect(result.isOk()).toBe(true);
    expect(result.unwrap().card?.note).toBe('whitespace note');
  });

  it('returns empty when the user only annotated a different passage', async () => {
    await createAnnotationCard(curatorId, { exact: 'a different passage' });

    const result = await useCase.execute({
      url: TEST_URL,
      exact: PASSAGE,
      curatorId: curatorId.value,
    });

    expect(result.isOk()).toBe(true);
    const response = result.unwrap();
    expect(response.card).toBeUndefined();
    expect(response.collections).toBeUndefined();
  });

  it('does not return another user’s annotation card for the same passage', async () => {
    await createAnnotationCard(otherCuratorId, { note: 'theirs' });

    const result = await useCase.execute({
      url: TEST_URL,
      exact: PASSAGE,
      curatorId: curatorId.value,
    });

    expect(result.isOk()).toBe(true);
    const response = result.unwrap();
    expect(response.card).toBeUndefined();
    expect(response.collections).toBeUndefined();
  });

  it('rejects an invalid URL or empty exact', async () => {
    const badUrl = await useCase.execute({
      url: 'not-a-url',
      exact: PASSAGE,
      curatorId: curatorId.value,
    });
    expect(badUrl.isErr()).toBe(true);

    const badExact = await useCase.execute({
      url: TEST_URL,
      exact: '   ',
      curatorId: curatorId.value,
    });
    expect(badExact.isErr()).toBe(true);
  });
});
