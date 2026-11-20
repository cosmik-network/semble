import { UpdateAnnotationAssociationsUseCase } from '../../application/useCases/commands/UpdateAnnotationAssociationsUseCase';
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
import { CardFactory } from '../../domain/CardFactory';
import { CardId } from '../../domain/value-objects/CardId';
import { UrlMetadata } from '../../domain/value-objects/UrlMetadata';

describe('UpdateAnnotationAssociationsUseCase', () => {
  let useCase: UpdateAnnotationAssociationsUseCase;
  let addAnnotationUseCase: AddAnnotationToLibraryUseCase;
  let cardRepository: InMemoryCardRepository;
  let collectionRepository: InMemoryCollectionRepository;
  let cardPublisher: FakeCardPublisher;
  let collectionPublisher: FakeCollectionPublisher;
  let eventPublisher: FakeEventPublisher;
  let curatorId: CuratorId;

  const addRequest = {
    url: 'https://example.com/annotated-article',
    curatorId: 'did:plc:testcurator',
    selectors: [
      { type: SelectorTypeEnum.TEXT_QUOTE, exact: 'the quoted passage' },
    ],
  };

  // Creates an annotation card in the library and returns its card ID
  const createAnnotation = async (note?: string): Promise<string> => {
    const result = await addAnnotationUseCase.execute({
      ...addRequest,
      note,
    });
    expect(result.isOk()).toBe(true);
    return result.unwrap().annotationCardId;
  };

  beforeEach(() => {
    cardRepository = InMemoryCardRepository.getInstance();
    collectionRepository = InMemoryCollectionRepository.getInstance();
    cardPublisher = new FakeCardPublisher();
    collectionPublisher = new FakeCollectionPublisher();
    eventPublisher = new FakeEventPublisher();

    const cardCollectionService = new CardCollectionService(
      collectionRepository,
      collectionPublisher,
      cardRepository,
    );
    const cardLibraryService = new CardLibraryService(
      cardRepository,
      cardPublisher,
      collectionRepository,
      cardCollectionService,
    );

    useCase = new UpdateAnnotationAssociationsUseCase(
      cardRepository,
      cardLibraryService,
      cardCollectionService,
      eventPublisher,
    );
    addAnnotationUseCase = new AddAnnotationToLibraryUseCase(
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

  const getStoredCard = (cardId: string) =>
    cardRepository.getStoredCard(CardId.createFromString(cardId).unwrap());

  it('sets the note on an annotation card', async () => {
    const cardId = await createAnnotation();

    const result = await useCase.execute({
      cardId,
      curatorId: curatorId.value,
      note: 'added later',
    });

    expect(result.isOk()).toBe(true);
    expect(getStoredCard(cardId)?.content.annotationContent?.note).toBe(
      'added later',
    );
  });

  it('updates an existing note and preserves the selectors', async () => {
    const cardId = await createAnnotation('first note');

    const result = await useCase.execute({
      cardId,
      curatorId: curatorId.value,
      note: 'second note',
    });

    expect(result.isOk()).toBe(true);
    const card = getStoredCard(cardId);
    expect(card?.content.annotationContent?.note).toBe('second note');
    expect(card?.content.annotationContent?.textQuoteSelector?.exact).toBe(
      'the quoted passage',
    );
  });

  it('clears the note when given an empty string', async () => {
    const cardId = await createAnnotation('to be removed');

    const result = await useCase.execute({
      cardId,
      curatorId: curatorId.value,
      note: '   ',
    });

    expect(result.isOk()).toBe(true);
    expect(
      getStoredCard(cardId)?.content.annotationContent?.note,
    ).toBeUndefined();
  });

  it('leaves the note untouched when note is not provided', async () => {
    const cardId = await createAnnotation('keep me');
    const collection = new CollectionBuilder()
      .withAuthorId(curatorId.value)
      .buildOrThrow();
    await collectionRepository.save(collection);

    const result = await useCase.execute({
      cardId,
      curatorId: curatorId.value,
      addToCollections: [collection.collectionId.getStringValue()],
    });

    expect(result.isOk()).toBe(true);
    expect(getStoredCard(cardId)?.content.annotationContent?.note).toBe(
      'keep me',
    );
  });

  it('adds the annotation card to collections', async () => {
    const cardId = await createAnnotation();
    const collection = new CollectionBuilder()
      .withAuthorId(curatorId.value)
      .buildOrThrow();
    await collectionRepository.save(collection);

    const result = await useCase.execute({
      cardId,
      curatorId: curatorId.value,
      addToCollections: [collection.collectionId.getStringValue()],
    });

    expect(result.isOk()).toBe(true);
    expect(result.unwrap().addedToCollections).toEqual([
      collection.collectionId.getStringValue(),
    ]);
    const storedCollection = collectionRepository.getStoredCollection(
      collection.collectionId,
    );
    expect(storedCollection?.cardLinks).toHaveLength(1);
    expect(storedCollection?.cardLinks[0]!.cardId.getStringValue()).toBe(
      cardId,
    );
  });

  it('removes the annotation card from collections', async () => {
    const cardId = await createAnnotation();
    const collection = new CollectionBuilder()
      .withAuthorId(curatorId.value)
      .buildOrThrow();
    await collectionRepository.save(collection);

    await useCase.execute({
      cardId,
      curatorId: curatorId.value,
      addToCollections: [collection.collectionId.getStringValue()],
    });

    const result = await useCase.execute({
      cardId,
      curatorId: curatorId.value,
      removeFromCollections: [collection.collectionId.getStringValue()],
    });

    expect(result.isOk()).toBe(true);
    expect(result.unwrap().removedFromCollections).toEqual([
      collection.collectionId.getStringValue(),
    ]);
    expect(
      collectionRepository.getStoredCollection(collection.collectionId)
        ?.cardLinks,
    ).toHaveLength(0);
  });

  it('rejects a card that is not an annotation', async () => {
    const urlCardResult = CardFactory.create({
      curatorId: curatorId.value,
      cardInput: {
        type: CardTypeEnum.URL,
        url: addRequest.url,
        metadata: UrlMetadata.create({ url: addRequest.url }).unwrap(),
      },
    });
    expect(urlCardResult.isOk()).toBe(true);
    const urlCard = urlCardResult.unwrap();
    await cardRepository.save(urlCard);

    const result = await useCase.execute({
      cardId: urlCard.cardId.getStringValue(),
      curatorId: curatorId.value,
      note: 'nope',
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toBe(
        'Card must be an annotation card to update associations.',
      );
    }
  });

  it('rejects a curator who does not own the card', async () => {
    const cardId = await createAnnotation();

    const result = await useCase.execute({
      cardId,
      curatorId: 'did:plc:someoneelse',
      note: 'not mine',
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toBe(
        'You do not have permission to update this card.',
      );
    }
  });

  it('rejects an unknown card id', async () => {
    const result = await useCase.execute({
      cardId: '00000000-0000-0000-0000-000000000000',
      curatorId: curatorId.value,
      note: 'missing',
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toBe('Annotation card not found.');
    }
  });
});
