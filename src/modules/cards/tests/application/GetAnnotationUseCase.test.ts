import { GetAnnotationUseCase } from '../../application/useCases/queries/GetAnnotationUseCase';
import { InMemoryCardRepository } from '../utils/InMemoryCardRepository';
import { InMemoryCardQueryRepository } from '../utils/InMemoryCardQueryRepository';
import { InMemoryCollectionRepository } from '../utils/InMemoryCollectionRepository';
import { InMemoryCollectionQueryRepository } from '../utils/InMemoryCollectionQueryRepository';
import { InMemoryConnectionRepository } from '../utils/InMemoryConnectionRepository';
import { FakeProfileService } from '../utils/FakeProfileService';
import { CuratorId } from '../../domain/value-objects/CuratorId';
import { CardBuilder } from '../utils/builders/CardBuilder';
import { URL } from '../../domain/value-objects/URL';

describe('GetAnnotationUseCase', () => {
  const TEST_URL = 'https://example.com/annotated-article';
  const PASSAGE = 'the quoted passage';

  let useCase: GetAnnotationUseCase;
  let cardRepository: InMemoryCardRepository;
  let collectionRepository: InMemoryCollectionRepository;
  let collectionQueryRepository: InMemoryCollectionQueryRepository;
  let connectionRepository: InMemoryConnectionRepository;
  let profileService: FakeProfileService;
  let curatorId: CuratorId;
  let otherCuratorId: CuratorId;

  const createAnnotationCard = async (
    curator: CuratorId,
    props: { exact?: string; note?: string } = {},
  ): Promise<void> => {
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
  };

  beforeEach(() => {
    cardRepository = InMemoryCardRepository.getInstance();
    collectionRepository = InMemoryCollectionRepository.getInstance();
    connectionRepository = InMemoryConnectionRepository.getInstance();
    const cardQueryRepository = new InMemoryCardQueryRepository(
      cardRepository,
      collectionRepository,
      connectionRepository,
    );
    collectionQueryRepository = new InMemoryCollectionQueryRepository(
      collectionRepository,
      cardRepository,
    );
    profileService = new FakeProfileService();

    useCase = new GetAnnotationUseCase(
      cardQueryRepository,
      collectionQueryRepository,
      profileService,
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
    profileService.clear();
  });

  it('returns the annotation view for a saved passage', async () => {
    await createAnnotationCard(curatorId, { note: 'notable' });

    const result = await useCase.execute({
      url: TEST_URL,
      exact: PASSAGE,
    });

    expect(result.isOk()).toBe(true);
    const annotation = result.unwrap().annotation;
    expect(annotation).toBeDefined();
    expect(annotation?.type).toBe('ANNOTATION');
    expect(annotation?.url).toBe(TEST_URL);
    expect(annotation?.note).toBe('notable');
    expect(annotation?.selectors[0]?.exact).toBe(PASSAGE);
    expect(annotation?.author.handle).toBe('testcurator');
    // Entity-level: one distinct saver of this passage
    expect(annotation?.libraryCount).toBe(1);
    // Tab counts: the passage has one note and is in no collections
    const counts = result.unwrap();
    expect(counts.noteCount).toBe(1);
    expect(counts.collectionCount).toBe(0);
  });

  it('matches on normalized exact text', async () => {
    await createAnnotationCard(curatorId);

    const result = await useCase.execute({
      url: TEST_URL,
      exact: `the  quoted   passage`,
    });

    expect(result.isOk()).toBe(true);
    expect(result.unwrap().annotation).toBeDefined();
  });

  it('aggregates counts across every card matching the passage', async () => {
    await createAnnotationCard(curatorId);
    await createAnnotationCard(otherCuratorId);

    const result = await useCase.execute({
      url: TEST_URL,
      exact: PASSAGE,
    });

    expect(result.isOk()).toBe(true);
    const annotation = result.unwrap().annotation;
    expect(annotation).toBeDefined();
    expect(annotation?.libraryCount).toBe(2);
  });

  it('returns an empty result for an unsaved passage', async () => {
    await createAnnotationCard(curatorId, { exact: 'a different passage' });

    const result = await useCase.execute({
      url: TEST_URL,
      exact: PASSAGE,
    });

    expect(result.isOk()).toBe(true);
    expect(result.unwrap().annotation).toBeUndefined();
  });

  it('rejects an invalid URL or empty exact', async () => {
    const badUrl = await useCase.execute({
      url: 'not-a-url',
      exact: PASSAGE,
    });
    expect(badUrl.isErr()).toBe(true);

    const badExact = await useCase.execute({
      url: TEST_URL,
      exact: '   ',
    });
    expect(badExact.isErr()).toBe(true);
  });
});
