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
import { computeAnnotationCID } from '@semble/types';

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

  it('resolves the passage by its annotation CID', async () => {
    await createAnnotationCard(curatorId, { note: 'notable' });
    const cid = computeAnnotationCID(TEST_URL, PASSAGE);

    const result = await useCase.execute({ cid });

    expect(result.isOk()).toBe(true);
    const value = result.unwrap();
    expect(value.cid).toBe(cid);
    // The matched passage's raw exact text is echoed for display
    expect(value.exact).toBe(PASSAGE);
    expect(value.annotation).toBeDefined();
    expect(value.annotation?.note).toBe('notable');
    expect(value.annotation?.cid).toBe(cid);
  });

  it('derives the same CID from whitespace-variant input as from the cid', async () => {
    await createAnnotationCard(curatorId);

    const byParts = await useCase.execute({
      url: TEST_URL,
      exact: `the  quoted   passage`,
    });
    const byCid = await useCase.execute({
      cid: computeAnnotationCID(TEST_URL, PASSAGE),
    });

    expect(byParts.unwrap().cid).toBe(byCid.unwrap().cid);
    expect(byParts.unwrap().annotation?.id).toBe(byCid.unwrap().annotation?.id);
  });

  it('returns an empty result for an unknown CID', async () => {
    await createAnnotationCard(curatorId);

    const result = await useCase.execute({
      cid: computeAnnotationCID(TEST_URL, 'never saved anywhere'),
    });

    expect(result.isOk()).toBe(true);
    expect(result.unwrap().annotation).toBeUndefined();
    expect(result.unwrap().exact).toBeUndefined();
  });

  it('rejects a malformed CID', async () => {
    const result = await useCase.execute({ cid: 'not-a-cid!' });
    expect(result.isErr()).toBe(true);
  });
});
