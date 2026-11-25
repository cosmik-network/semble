import { GetAnnotationsForUrlUseCase } from '../../application/useCases/queries/GetAnnotationsForUrlUseCase';
import { GetNotesForAnnotationUseCase } from '../../application/useCases/queries/GetNotesForAnnotationUseCase';
import { GetLibrariesForAnnotationUseCase } from '../../application/useCases/queries/GetLibrariesForAnnotationUseCase';
import { GetCollectionsForAnnotationUseCase } from '../../application/useCases/queries/GetCollectionsForAnnotationUseCase';
import { GetConnectionsForAnnotationUseCase } from '../../application/useCases/queries/GetConnectionsForAnnotationUseCase';
import { InMemoryCardRepository } from '../utils/InMemoryCardRepository';
import { InMemoryCollectionRepository } from '../utils/InMemoryCollectionRepository';
import { InMemoryCardQueryRepository } from '../utils/InMemoryCardQueryRepository';
import { InMemoryCollectionQueryRepository } from '../utils/InMemoryCollectionQueryRepository';
import { InMemoryConnectionRepository } from '../utils/InMemoryConnectionRepository';
import { InMemoryConnectionQueryRepository } from '../utils/InMemoryConnectionQueryRepository';
import { CardBuilder } from '../utils/builders/CardBuilder';
import { CollectionBuilder } from '../utils/builders/CollectionBuilder';
import { CuratorId } from '../../domain/value-objects/CuratorId';
import { CardTypeEnum } from '../../domain/value-objects/CardType';
import { URL } from '../../domain/value-objects/URL';
import { Connection } from '../../domain/Connection';
import { UrlOrCardId } from '../../domain/value-objects/UrlOrCardId';
import { CardId } from '../../domain/value-objects/CardId';
import { FakeProfileService } from '../utils/FakeProfileService';
import { InMemoryFollowsRepository } from '../../../user/tests/infrastructure/InMemoryFollowsRepository';
import { CardSortField, SortOrder } from '../../domain/ICardQueryRepository';

describe('Annotation read use cases', () => {
  const TEST_URL = 'https://example.com/annotated-article';
  const PASSAGE = 'the quoted passage';

  let cardRepository: InMemoryCardRepository;
  let collectionRepository: InMemoryCollectionRepository;
  let connectionRepository: InMemoryConnectionRepository;
  let cardQueryRepository: InMemoryCardQueryRepository;
  let collectionQueryRepository: InMemoryCollectionQueryRepository;
  let connectionQueryRepository: InMemoryConnectionQueryRepository;
  let profileService: FakeProfileService;
  let followsRepository: InMemoryFollowsRepository;

  let getAnnotationsForUrl: GetAnnotationsForUrlUseCase;
  let getNotesForAnnotation: GetNotesForAnnotationUseCase;
  let getLibrariesForAnnotation: GetLibrariesForAnnotationUseCase;
  let getCollectionsForAnnotation: GetCollectionsForAnnotationUseCase;
  let getConnectionsForAnnotation: GetConnectionsForAnnotationUseCase;

  let curator1: CuratorId;
  let curator2: CuratorId;

  const defaultOptions = {
    page: 1,
    limit: 20,
    sortBy: CardSortField.UPDATED_AT,
    sortOrder: SortOrder.DESC,
  };

  // Creates an annotation card on TEST_URL for the given curator and adds
  // it to their library
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
    connectionQueryRepository = new InMemoryConnectionQueryRepository(
      connectionRepository,
    );
    profileService = new FakeProfileService();
    followsRepository = InMemoryFollowsRepository.getInstance();

    getAnnotationsForUrl = new GetAnnotationsForUrlUseCase(cardQueryRepository);
    getNotesForAnnotation = new GetNotesForAnnotationUseCase(
      cardQueryRepository,
      profileService,
    );
    getLibrariesForAnnotation = new GetLibrariesForAnnotationUseCase(
      cardQueryRepository,
      profileService,
    );
    getCollectionsForAnnotation = new GetCollectionsForAnnotationUseCase(
      collectionQueryRepository,
      cardQueryRepository,
      profileService,
      followsRepository,
    );
    getConnectionsForAnnotation = new GetConnectionsForAnnotationUseCase(
      connectionQueryRepository,
      cardQueryRepository,
      profileService,
    );

    curator1 = CuratorId.create('did:plc:curator1').unwrap();
    curator2 = CuratorId.create('did:plc:curator2').unwrap();

    profileService.addProfile({
      id: curator1.value,
      name: 'Curator One',
      handle: 'curator1',
    });
    profileService.addProfile({
      id: curator2.value,
      name: 'Curator Two',
      handle: 'curator2',
    });
  });

  afterEach(() => {
    cardRepository.clear();
    collectionRepository.clear();
    connectionRepository.clear();
    collectionQueryRepository.clear();
    profileService.clear();
    followsRepository.clear();
  });

  describe('GetAnnotationsForUrlUseCase', () => {
    it('returns one entry per unique passage, with its cards as a notes-first preview', async () => {
      // Two curators on the same passage — one entry
      await createAnnotationCard(curator1, { note: 'a note' });
      await createAnnotationCard(curator2);
      await createAnnotationCard(curator1, { exact: 'a different passage' });

      const result = await getAnnotationsForUrl.execute({
        url: TEST_URL,
        ...defaultOptions,
      });

      expect(result.isOk()).toBe(true);
      const annotations = result.unwrap().annotations;
      expect(annotations).toHaveLength(2);
      // Passage views carry the passage, not any one card's note
      expect('note' in annotations[0]!).toBe(false);
      const passages = annotations.map((a) => a.selectors[0]!.exact).sort();
      expect(passages).toEqual([PASSAGE, 'a different passage'].sort());

      // The shared passage's cards are embedded, notes first
      const shared = annotations.find(
        (a) => a.selectors[0]!.exact === PASSAGE,
      )!;
      expect(shared.annotationCards).toHaveLength(2);
      expect(shared.annotationCards[0]!.note).toBe('a note');
      expect(shared.annotationCards[0]!.userId).toBe(curator1.value);
      expect(shared.annotationCards[1]!.note).toBeUndefined();
      expect(shared.annotationCards[1]!.userId).toBe(curator2.value);
    });

    it('reports entity-level libraryCount across all cards matching the passage', async () => {
      // Two cards on the same passage, one on a different passage
      await createAnnotationCard(curator1, { note: 'a note' });
      await createAnnotationCard(curator2);
      await createAnnotationCard(curator1, { exact: 'a different passage' });

      const result = await getAnnotationsForUrl.execute({
        url: TEST_URL,
        ...defaultOptions,
      });

      expect(result.isOk()).toBe(true);
      const annotations = result.unwrap().annotations;
      const samePassage = annotations.find(
        (a) => a.selectors[0]!.exact === PASSAGE,
      );
      const otherPassage = annotations.find(
        (a) => a.selectors[0]!.exact === 'a different passage',
      );
      // The passage view sees the aggregate (2 users), not the
      // card-level count (1); the other passage only counts itself
      expect(samePassage!.libraryCount).toBe(2);
      expect(otherPassage!.libraryCount).toBe(1);
    });

    it('rejects an invalid URL', async () => {
      const result = await getAnnotationsForUrl.execute({
        url: 'not-a-url',
        ...defaultOptions,
      });
      expect(result.isErr()).toBe(true);
    });
  });

  describe('GetNotesForAnnotationUseCase', () => {
    it('returns notes of all annotation cards matching the passage', async () => {
      await createAnnotationCard(curator1, { note: 'first note' });
      await createAnnotationCard(curator2, { note: 'second note' });
      // Same URL, different passage — must not match
      await createAnnotationCard(curator1, {
        exact: 'a different passage',
        note: 'other note',
      });

      const result = await getNotesForAnnotation.execute({
        url: TEST_URL,
        exact: PASSAGE,
        ...defaultOptions,
      });

      expect(result.isOk()).toBe(true);
      const notes = result.unwrap().notes;
      expect(notes).toHaveLength(2);
      expect(notes.map((n) => n.note).sort()).toEqual([
        'first note',
        'second note',
      ]);
      // Order depends on createdAt milliseconds, so assert per-note, not [0]
      const first = notes.find((n) => n.note === 'first note')!;
      expect(first.author.handle).toBe('curator1');
    });

    it('matches on normalized exact text', async () => {
      await createAnnotationCard(curator1, { note: 'whitespace note' });

      // Extra internal whitespace collapses to the same normalized key
      const result = await getNotesForAnnotation.execute({
        url: TEST_URL,
        exact: `the  quoted   passage`,
        ...defaultOptions,
      });

      expect(result.isOk()).toBe(true);
      expect(result.unwrap().notes).toHaveLength(1);
    });

    it('excludes matching cards without a note', async () => {
      await createAnnotationCard(curator1);
      await createAnnotationCard(curator2, { note: 'only note' });

      const result = await getNotesForAnnotation.execute({
        url: TEST_URL,
        exact: PASSAGE,
        ...defaultOptions,
      });

      expect(result.isOk()).toBe(true);
      expect(result.unwrap().notes).toHaveLength(1);
    });

    it('rejects an empty exact', async () => {
      const result = await getNotesForAnnotation.execute({
        url: TEST_URL,
        exact: '   ',
        ...defaultOptions,
      });
      expect(result.isErr()).toBe(true);
    });
  });

  describe('GetLibrariesForAnnotationUseCase', () => {
    it('returns the user and annotation card for each matching card in a library', async () => {
      const cardId1 = await createAnnotationCard(curator1, { note: 'mine' });
      await createAnnotationCard(curator2);

      const result = await getLibrariesForAnnotation.execute({
        url: TEST_URL,
        exact: PASSAGE,
        ...defaultOptions,
      });

      expect(result.isOk()).toBe(true);
      const libraries = result.unwrap().libraries;
      expect(libraries).toHaveLength(2);
      const first = libraries.find((l) => l.card.id === cardId1)!;
      expect(first.user.handle).toBe('curator1');
      expect(first.card.note).toBe('mine');
      expect(first.card.selectors[0]!.exact).toBe(PASSAGE);
    });
  });

  describe('GetCollectionsForAnnotationUseCase', () => {
    it('returns collections containing any matching annotation card', async () => {
      const cardId = await createAnnotationCard(curator1, {
        note: 'collected',
      });
      // Matching card not in any collection
      await createAnnotationCard(curator2);

      const collection = new CollectionBuilder()
        .withAuthorId(curator1.value)
        .withName('Best Passages')
        .build();
      if (collection instanceof Error) {
        throw new Error('Failed to create collection');
      }
      collection.addCard(CardId.createFromString(cardId).unwrap(), curator1);
      await collectionRepository.save(collection);

      const result = await getCollectionsForAnnotation.execute({
        url: TEST_URL,
        exact: PASSAGE,
        page: 1,
        limit: 20,
        sortBy: 'addedAt' as never,
        sortOrder: SortOrder.DESC,
      });

      expect(result.isOk()).toBe(true);
      const collections = result.unwrap().collections;
      expect(collections).toHaveLength(1);
      expect(collections[0]!.name).toBe('Best Passages');
      expect(collections[0]!.author.handle).toBe('curator1');
    });

    it('returns empty when no annotation matches the passage', async () => {
      await createAnnotationCard(curator1);

      const result = await getCollectionsForAnnotation.execute({
        url: TEST_URL,
        exact: 'nothing matches this',
        page: 1,
        limit: 20,
        sortBy: 'addedAt' as never,
        sortOrder: SortOrder.DESC,
      });

      expect(result.isOk()).toBe(true);
      expect(result.unwrap().collections).toHaveLength(0);
    });
  });

  describe('GetConnectionsForAnnotationUseCase', () => {
    it('returns connections where a matching annotation card is an endpoint', async () => {
      const cardId = await createAnnotationCard(curator1, {
        note: 'connected',
      });

      const otherUrl = URL.create('https://example.com/other').unwrap();
      const connection = Connection.create({
        source: UrlOrCardId.createFromCard(
          CardId.createFromString(cardId).unwrap(),
        ).unwrap(),
        target: UrlOrCardId.createFromUrl(otherUrl).unwrap(),
        curatorId: curator1,
      }).unwrap();
      await connectionRepository.save(connection);

      const result = await getConnectionsForAnnotation.execute({
        url: TEST_URL,
        exact: PASSAGE,
        page: 1,
        limit: 20,
        sortBy: 'createdAt' as never,
        sortOrder: SortOrder.DESC,
      });

      expect(result.isOk()).toBe(true);
      const connections = result.unwrap().connections;
      expect(connections).toHaveLength(1);
      expect(connections[0]!.annotationCardId).toBe(cardId);
      expect(connections[0]!.other.type).toBe('URL');
      expect(connections[0]!.other.url).toBe('https://example.com/other');
      expect(connections[0]!.other.metadata.url).toBe(
        'https://example.com/other',
      );
      expect(connections[0]!.connection.curator.handle).toBe('curator1');

      // Entity-level connection count shows up on the annotation card views
      const annotationsResult = await getAnnotationsForUrl.execute({
        url: TEST_URL,
        ...defaultOptions,
      });
      expect(annotationsResult.isOk()).toBe(true);
      expect(annotationsResult.unwrap().annotations[0]!.connectionCount).toBe(
        1,
      );
    });

    it('does not return connections for non-matching cards', async () => {
      const cardId = await createAnnotationCard(curator1, {
        exact: 'a different passage',
      });

      const otherUrl = URL.create('https://example.com/other').unwrap();
      const connection = Connection.create({
        source: UrlOrCardId.createFromCard(
          CardId.createFromString(cardId).unwrap(),
        ).unwrap(),
        target: UrlOrCardId.createFromUrl(otherUrl).unwrap(),
        curatorId: curator1,
      }).unwrap();
      await connectionRepository.save(connection);

      const result = await getConnectionsForAnnotation.execute({
        url: TEST_URL,
        exact: PASSAGE,
        page: 1,
        limit: 20,
        sortBy: 'createdAt' as never,
        sortOrder: SortOrder.DESC,
      });

      expect(result.isOk()).toBe(true);
      expect(result.unwrap().connections).toHaveLength(0);
    });
  });
});
