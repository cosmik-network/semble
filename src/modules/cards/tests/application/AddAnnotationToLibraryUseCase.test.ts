import { AddAnnotationToLibraryUseCase } from '../../application/useCases/commands/AddAnnotationToLibraryUseCase';
import { InMemoryCardRepository } from '../utils/InMemoryCardRepository';
import { InMemoryCollectionRepository } from '../utils/InMemoryCollectionRepository';
import { FakeCardPublisher } from '../utils/FakeCardPublisher';
import { FakeCollectionPublisher } from '../utils/FakeCollectionPublisher';
import { CardLibraryService } from '../../domain/services/CardLibraryService';
import { CardCollectionService } from '../../domain/services/CardCollectionService';
import { CuratorId } from '../../domain/value-objects/CuratorId';
import { CardTypeEnum } from '../../domain/value-objects/CardType';
import { SelectorTypeEnum } from '../../domain/value-objects/selectors/SelectorType';
import { FakeEventPublisher } from '../utils/FakeEventPublisher';
import { CollectionBuilder } from '../utils/builders/CollectionBuilder';

describe('AddAnnotationToLibraryUseCase', () => {
  let useCase: AddAnnotationToLibraryUseCase;
  let cardRepository: InMemoryCardRepository;
  let collectionRepository: InMemoryCollectionRepository;
  let cardPublisher: FakeCardPublisher;
  let collectionPublisher: FakeCollectionPublisher;
  let cardLibraryService: CardLibraryService;
  let cardCollectionService: CardCollectionService;
  let eventPublisher: FakeEventPublisher;
  let curatorId: CuratorId;

  const baseRequest = {
    url: 'https://example.com/annotated-article',
    curatorId: 'did:plc:testcurator',
    selectors: [
      {
        type: SelectorTypeEnum.TEXT_QUOTE,
        exact: 'the quoted passage',
        prefix: 'as we have argued, ',
        suffix: ' appears three times',
      },
    ],
  };

  beforeEach(() => {
    cardRepository = InMemoryCardRepository.getInstance();
    collectionRepository = InMemoryCollectionRepository.getInstance();
    cardPublisher = new FakeCardPublisher();
    collectionPublisher = new FakeCollectionPublisher();
    eventPublisher = new FakeEventPublisher();

    cardCollectionService = new CardCollectionService(
      collectionRepository,
      collectionPublisher,
      cardRepository,
    );
    cardLibraryService = new CardLibraryService(
      cardRepository,
      cardPublisher,
      collectionRepository,
      cardCollectionService,
    );

    useCase = new AddAnnotationToLibraryUseCase(
      cardRepository,
      cardLibraryService,
      cardCollectionService,
      eventPublisher,
    );

    curatorId = CuratorId.create('did:plc:testcurator').unwrap();
  });

  afterEach(() => {
    cardRepository.clear();
    collectionRepository.clear();
    cardPublisher.clear();
    collectionPublisher.clear();
    eventPublisher.clear();
  });

  it('creates and publishes only the annotation card', async () => {
    const result = await useCase.execute({ ...baseRequest });

    expect(result.isOk()).toBe(true);
    const response = result.unwrap();
    expect(response.annotationCardId).toBeDefined();

    const savedCards = cardRepository.getAllCards();
    expect(savedCards).toHaveLength(1);

    const annotationCard = savedCards[0]!;
    expect(annotationCard.content.type).toBe(CardTypeEnum.ANNOTATION);
    expect(annotationCard.url?.value).toBe(baseRequest.url);
    expect(annotationCard.isInLibrary(curatorId)).toBe(true);
    expect(annotationCard.parentCardId).toBeUndefined();

    const annotationContent = annotationCard.content.annotationContent;
    expect(annotationContent?.note).toBeUndefined();
    expect(annotationContent?.textQuoteSelector?.exact).toBe(
      'the quoted passage',
    );

    expect(cardPublisher.getPublishedCards()).toHaveLength(1);
  });

  it('does not create a URL card even when the url is not saved', async () => {
    await useCase.execute({ ...baseRequest });

    const savedCards = cardRepository.getAllCards();
    expect(savedCards).toHaveLength(1);
    expect(savedCards[0]!.content.type).toBe(CardTypeEnum.ANNOTATION);
  });

  it('stores the note on the annotation card', async () => {
    const result = await useCase.execute({
      ...baseRequest,
      note: 'this claim needs a source',
    });

    expect(result.isOk()).toBe(true);
    const annotationCard = cardRepository
      .getAllCards()
      .find((card) => card.content.type === CardTypeEnum.ANNOTATION);

    expect(annotationCard?.content.annotationContent?.note).toBe(
      'this claim needs a source',
    );
  });

  it('supports multiple annotations on the same url', async () => {
    await useCase.execute({ ...baseRequest });
    await useCase.execute({
      ...baseRequest,
      selectors: [
        { type: SelectorTypeEnum.TEXT_QUOTE, exact: 'a different passage' },
      ],
    });

    const annotationCards = cardRepository
      .getAllCards()
      .filter((card) => card.content.type === CardTypeEnum.ANNOTATION);
    expect(annotationCards).toHaveLength(2);
  });

  it('adds the annotation card to collections when collectionIds provided', async () => {
    const collection = new CollectionBuilder()
      .withAuthorId(curatorId.value)
      .buildOrThrow();
    await collectionRepository.save(collection);

    const result = await useCase.execute({
      ...baseRequest,
      collectionIds: [collection.collectionId.getStringValue()],
    });

    expect(result.isOk()).toBe(true);
    const storedCollection = collectionRepository.getStoredCollection(
      collection.collectionId,
    );
    expect(storedCollection?.cardLinks).toHaveLength(1);
    expect(storedCollection?.cardLinks[0]!.cardId.getStringValue()).toBe(
      result.unwrap().annotationCardId,
    );
  });

  it('rejects an invalid selector', async () => {
    const result = await useCase.execute({
      ...baseRequest,
      selectors: [{ type: SelectorTypeEnum.TEXT_QUOTE, exact: '   ' }],
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toBe(
        'TextQuoteSelector must have exact text',
      );
    }
    expect(cardRepository.getAllCards()).toHaveLength(0);
  });

  it('rejects an empty selector list', async () => {
    const result = await useCase.execute({
      ...baseRequest,
      selectors: [],
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toBe(
        'Annotation must have at least one selector',
      );
    }
  });
});
