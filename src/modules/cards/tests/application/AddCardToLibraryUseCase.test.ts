import { AddCardToLibraryUseCase } from '../../application/useCases/commands/AddCardToLibraryUseCase';
import { InMemoryCardRepository } from '../utils/InMemoryCardRepository';
import { InMemoryCollectionRepository } from '../utils/InMemoryCollectionRepository';
import { FakeCardPublisher } from '../utils/FakeCardPublisher';
import { FakeCollectionPublisher } from '../utils/FakeCollectionPublisher';
import { CardLibraryService } from '../../domain/services/CardLibraryService';
import { CardCollectionService } from '../../domain/services/CardCollectionService';
import { CuratorId } from '../../domain/value-objects/CuratorId';
import { CollectionBuilder } from '../utils/builders/CollectionBuilder';
import { CardBuilder } from '../utils/builders/CardBuilder';
import { CardTypeEnum } from '../../domain/value-objects/CardType';
import { CARD_ERROR_MESSAGES } from '../../domain/Card';

describe('AddCardToLibraryUseCase', () => {
  let useCase: AddCardToLibraryUseCase;
  let cardRepository: InMemoryCardRepository;
  let collectionRepository: InMemoryCollectionRepository;
  let cardPublisher: FakeCardPublisher;
  let collectionPublisher: FakeCollectionPublisher;
  let cardLibraryService: CardLibraryService;
  let cardCollectionService: CardCollectionService;
  let curatorId: CuratorId;
  let curatorId2: CuratorId;

  beforeEach(() => {
    cardRepository = InMemoryCardRepository.getInstance();
    collectionRepository = InMemoryCollectionRepository.getInstance();
    cardPublisher = new FakeCardPublisher();
    collectionPublisher = new FakeCollectionPublisher();

    cardLibraryService = new CardLibraryService(
      cardRepository,
      cardPublisher,
      collectionRepository,
      cardCollectionService,
    );
    cardCollectionService = new CardCollectionService(
      collectionRepository,
      collectionPublisher,
      cardRepository,
    );

    useCase = new AddCardToLibraryUseCase(
      cardRepository,
      cardLibraryService,
      cardCollectionService,
    );

    curatorId = CuratorId.create('did:plc:testcurator').unwrap();
    curatorId2 = CuratorId.create('did:plc:testcurator2').unwrap();
  });

  afterEach(() => {
    cardRepository.clear();
    collectionRepository.clear();
    cardPublisher.clear();
    collectionPublisher.clear();
  });

  describe('Basic card addition to library', () => {
    it('should not allow adding an existing url card to library', async () => {
      // Create and save a card first
      const card = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withType(CardTypeEnum.URL)
        .build();

      if (card instanceof Error) {
        throw new Error(`Failed to create card: ${card.message}`);
      }

      const addToLibResult = card.addToLibrary(curatorId);
      if (addToLibResult.isErr()) {
        throw new Error(
          `Failed to add card to library: ${addToLibResult.error.message}`,
        );
      }

      await cardRepository.save(card);

      const request = {
        cardId: card.cardId.getStringValue(),
        curatorId: curatorId2.value,
      };

      const result = await useCase.execute(request);

      if (result.isOk()) {
        throw new Error('Expected use case to fail, but it succeeded');
      }
      expect(result.isErr()).toBe(true);
      expect(result.error.message).toContain(
        CARD_ERROR_MESSAGES.URL_CARD_SINGLE_LIBRARY_ONLY,
      );
    });

    it('should fail when card does not exist', async () => {
      const request = {
        cardId: 'non-existent-card-id',
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Card not found');
      }
    });
  });

  describe('Collection handling', () => {
    it('should add card to specified collections', async () => {
      // Create and save a card first
      const card = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withType(CardTypeEnum.URL)
        .build();

      if (card instanceof Error) {
        throw new Error(`Failed to create card: ${card.message}`);
      }

      await cardRepository.save(card);

      // Create a test collection
      const collection = new CollectionBuilder()
        .withAuthorId(curatorId.value)
        .withName('Test Collection')
        .build();

      if (collection instanceof Error) {
        throw new Error(`Failed to create collection: ${collection.message}`);
      }

      await collectionRepository.save(collection);

      const request = {
        cardId: card.cardId.getStringValue(),
        collectionIds: [collection.collectionId.getStringValue()],
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);

      // Verify card was published to library
      const publishedCards = cardPublisher.getPublishedCards();
      expect(publishedCards).toHaveLength(1);

      // Verify collection link was published
      const publishedLinks = collectionPublisher.getPublishedLinksForCollection(
        collection.collectionId.getStringValue(),
      );
      expect(publishedLinks).toHaveLength(1);
      expect(publishedLinks[0]?.cardId).toBe(card.cardId.getStringValue());
    });

    it('should add card to multiple collections', async () => {
      // Create and save a card first
      const card = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withType(CardTypeEnum.NOTE)
        .build();

      if (card instanceof Error) {
        throw new Error(`Failed to create card: ${card.message}`);
      }

      await cardRepository.save(card);

      // Create test collections
      const collection1 = new CollectionBuilder()
        .withAuthorId(curatorId.value)
        .withName('Test Collection 1')
        .build();

      const collection2 = new CollectionBuilder()
        .withAuthorId(curatorId.value)
        .withName('Test Collection 2')
        .build();

      if (collection1 instanceof Error || collection2 instanceof Error) {
        throw new Error('Failed to create collections');
      }

      await collectionRepository.save(collection1);
      await collectionRepository.save(collection2);

      const request = {
        cardId: card.cardId.getStringValue(),
        collectionIds: [
          collection1.collectionId.getStringValue(),
          collection2.collectionId.getStringValue(),
        ],
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);

      // Verify card was published to library
      const publishedCards = cardPublisher.getPublishedCards();
      expect(publishedCards).toHaveLength(1);

      // Verify collection links were published for both collections
      const publishedLinks1 =
        collectionPublisher.getPublishedLinksForCollection(
          collection1.collectionId.getStringValue(),
        );
      const publishedLinks2 =
        collectionPublisher.getPublishedLinksForCollection(
          collection2.collectionId.getStringValue(),
        );

      expect(publishedLinks1).toHaveLength(1);
      expect(publishedLinks2).toHaveLength(1);
      expect(publishedLinks1[0]?.cardId).toBe(card.cardId.getStringValue());
      expect(publishedLinks2[0]?.cardId).toBe(card.cardId.getStringValue());
    });

    it('should work without collections when none are specified', async () => {
      // Create and save a card first
      const card = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withType(CardTypeEnum.URL)
        .build();

      if (card instanceof Error) {
        throw new Error(`Failed to create card: ${card.message}`);
      }

      await cardRepository.save(card);

      const request = {
        cardId: card.cardId.getStringValue(),
        curatorId: curatorId.value,
        // No collectionIds specified
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);

      // Verify card was published to library
      const publishedCards = cardPublisher.getPublishedCards();
      expect(publishedCards).toHaveLength(1);

      // Verify no collection links were published
      const allPublishedLinks = collectionPublisher.getAllPublishedLinks();
      expect(allPublishedLinks).toHaveLength(0);
    });

    it('should fail when collection does not exist', async () => {
      // Create and save a card first
      const card = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withType(CardTypeEnum.URL)
        .build();

      if (card instanceof Error) {
        throw new Error(`Failed to create card: ${card.message}`);
      }

      await cardRepository.save(card);

      const request = {
        cardId: card.cardId.getStringValue(),
        collectionIds: ['non-existent-collection-id'],
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Collection not found');
      }
    });
  });

  describe('Validation', () => {
    it('should fail with invalid card ID', async () => {
      const request = {
        cardId: 'invalid-card-id',
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('invalid-card-id');
      }
    });

    it('should fail with invalid curator ID', async () => {
      // Create and save a card first
      const card = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withType(CardTypeEnum.URL)
        .build();

      if (card instanceof Error) {
        throw new Error(`Failed to create card: ${card.message}`);
      }

      await cardRepository.save(card);

      const request = {
        cardId: card.cardId.getStringValue(),
        curatorId: 'invalid-curator-id',
      };

      const result = await useCase.execute(request);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Invalid curator ID');
      }
    });

    it('should fail with invalid collection ID', async () => {
      // Create and save a card first
      const card = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withType(CardTypeEnum.URL)
        .build();

      if (card instanceof Error) {
        throw new Error(`Failed to create card: ${card.message}`);
      }

      await cardRepository.save(card);

      const request = {
        cardId: card.cardId.getStringValue(),
        collectionIds: ['invalid-collection-id'],
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('invalid-collection-id');
      }
    });
  });
});
