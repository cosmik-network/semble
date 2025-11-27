import { UpdateUrlCardAssociationsUseCase } from '../../application/useCases/commands/UpdateUrlCardAssociationsUseCase';
import { AddUrlToLibraryUseCase } from '../../application/useCases/commands/AddUrlToLibraryUseCase';
import { InMemoryCardRepository } from '../utils/InMemoryCardRepository';
import { InMemoryCollectionRepository } from '../utils/InMemoryCollectionRepository';
import { FakeCardPublisher } from '../utils/FakeCardPublisher';
import { FakeCollectionPublisher } from '../utils/FakeCollectionPublisher';
import { FakeMetadataService } from '../utils/FakeMetadataService';
import { CardLibraryService } from '../../domain/services/CardLibraryService';
import { CardCollectionService } from '../../domain/services/CardCollectionService';
import { CuratorId } from '../../domain/value-objects/CuratorId';
import { CollectionBuilder } from '../utils/builders/CollectionBuilder';
import { CardTypeEnum } from '../../domain/value-objects/CardType';
import { FakeEventPublisher } from '../utils/FakeEventPublisher';

describe('UpdateUrlCardAssociationsUseCase', () => {
  let useCase: UpdateUrlCardAssociationsUseCase;
  let addUrlToLibraryUseCase: AddUrlToLibraryUseCase;
  let cardRepository: InMemoryCardRepository;
  let collectionRepository: InMemoryCollectionRepository;
  let cardPublisher: FakeCardPublisher;
  let collectionPublisher: FakeCollectionPublisher;
  let metadataService: FakeMetadataService;
  let cardLibraryService: CardLibraryService;
  let cardCollectionService: CardCollectionService;
  let eventPublisher: FakeEventPublisher;
  let curatorId: CuratorId;

  beforeEach(() => {
    cardRepository = InMemoryCardRepository.getInstance();
    collectionRepository = InMemoryCollectionRepository.getInstance();
    cardPublisher = new FakeCardPublisher();
    collectionPublisher = new FakeCollectionPublisher();
    metadataService = new FakeMetadataService();
    eventPublisher = new FakeEventPublisher();

    cardLibraryService = new CardLibraryService(
      cardRepository,
      cardPublisher,
      collectionRepository,
      cardCollectionService,
    );
    cardCollectionService = new CardCollectionService(
      collectionRepository,
      collectionPublisher,
    );

    useCase = new UpdateUrlCardAssociationsUseCase(
      cardRepository,
      cardLibraryService,
      cardCollectionService,
      eventPublisher,
    );

    addUrlToLibraryUseCase = new AddUrlToLibraryUseCase(
      cardRepository,
      metadataService,
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
    metadataService.clear();
    eventPublisher.clear();
  });

  describe('Note management', () => {
    it('should create a note for an existing URL card', async () => {
      const url = 'https://example.com/article';

      // First, add the URL to the library
      const addResult = await addUrlToLibraryUseCase.execute({
        url,
        curatorId: curatorId.value,
      });
      expect(addResult.isOk()).toBe(true);
      const urlCardId = addResult.unwrap().urlCardId;

      // Now create a note for it
      const updateRequest = {
        cardId: urlCardId,
        curatorId: curatorId.value,
        note: 'This is my note',
      };

      const result = await useCase.execute(updateRequest);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.noteCardId).toBeDefined();

      // Verify note card was created
      const savedCards = cardRepository.getAllCards();
      const noteCard = savedCards.find(
        (card) => card.content.type === CardTypeEnum.NOTE,
      );
      expect(noteCard).toBeDefined();
      expect(noteCard?.content.noteContent?.text).toBe('This is my note');
    });

    it('should update an existing note for a URL card', async () => {
      const url = 'https://example.com/article';

      // First, add the URL with a note
      const addResult = await addUrlToLibraryUseCase.execute({
        url,
        note: 'Original note',
        curatorId: curatorId.value,
      });
      expect(addResult.isOk()).toBe(true);
      const addResponse = addResult.unwrap();

      // Now update the note
      const updateRequest = {
        cardId: addResponse.urlCardId,
        curatorId: curatorId.value,
        note: 'Updated note',
      };

      const result = await useCase.execute(updateRequest);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.noteCardId).toBe(addResponse.noteCardId);

      // Verify note was updated
      const savedCards = cardRepository.getAllCards();
      const noteCard = savedCards.find(
        (card) => card.content.type === CardTypeEnum.NOTE,
      );
      expect(noteCard).toBeDefined();
      expect(noteCard?.content.noteContent?.text).toBe('Updated note');
    });

    it('should fail if URL card does not exist', async () => {
      const request = {
        cardId: 'nonexistent-card-id',
        curatorId: curatorId.value,
        note: 'This should fail',
      };

      const result = await useCase.execute(request);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain(
          'URL card not found. Please add the URL to your library first.',
        );
      }
    });
  });

  describe('Collection management', () => {
    it('should add URL card to collections', async () => {
      const url = 'https://example.com/article';

      // Create collections
      const collection1 = new CollectionBuilder()
        .withAuthorId(curatorId.value)
        .withName('Collection 1')
        .build();
      const collection2 = new CollectionBuilder()
        .withAuthorId(curatorId.value)
        .withName('Collection 2')
        .build();

      if (collection1 instanceof Error || collection2 instanceof Error) {
        throw new Error('Failed to create collections');
      }

      await collectionRepository.save(collection1);
      await collectionRepository.save(collection2);

      // Add URL to library
      const addResult = await addUrlToLibraryUseCase.execute({
        url,
        curatorId: curatorId.value,
      });
      expect(addResult.isOk()).toBe(true);
      const urlCardId = addResult.unwrap().urlCardId;

      // Add to collections
      const updateRequest = {
        cardId: urlCardId,
        curatorId: curatorId.value,
        addToCollections: [
          collection1.collectionId.getStringValue(),
          collection2.collectionId.getStringValue(),
        ],
      };

      const result = await useCase.execute(updateRequest);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.addedToCollections).toHaveLength(2);
      expect(response.addedToCollections).toContain(
        collection1.collectionId.getStringValue(),
      );
      expect(response.addedToCollections).toContain(
        collection2.collectionId.getStringValue(),
      );
    });

    it('should remove URL card from collections', async () => {
      const url = 'https://example.com/article';

      // Create collection
      const collection = new CollectionBuilder()
        .withAuthorId(curatorId.value)
        .withName('Test Collection')
        .build();

      if (collection instanceof Error) {
        throw new Error('Failed to create collection');
      }

      await collectionRepository.save(collection);

      // Add URL to library and collection
      const addResult = await addUrlToLibraryUseCase.execute({
        url,
        collectionIds: [collection.collectionId.getStringValue()],
        curatorId: curatorId.value,
      });
      expect(addResult.isOk()).toBe(true);
      const urlCardId = addResult.unwrap().urlCardId;

      // Remove from collection
      const updateRequest = {
        cardId: urlCardId,
        curatorId: curatorId.value,
        removeFromCollections: [collection.collectionId.getStringValue()],
      };

      const result = await useCase.execute(updateRequest);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.removedFromCollections).toHaveLength(1);
      expect(response.removedFromCollections).toContain(
        collection.collectionId.getStringValue(),
      );
    });

    it('should add and remove from different collections in same request', async () => {
      const url = 'https://example.com/article';

      // Create collections
      const collection1 = new CollectionBuilder()
        .withAuthorId(curatorId.value)
        .withName('Collection 1')
        .build();
      const collection2 = new CollectionBuilder()
        .withAuthorId(curatorId.value)
        .withName('Collection 2')
        .build();
      const collection3 = new CollectionBuilder()
        .withAuthorId(curatorId.value)
        .withName('Collection 3')
        .build();

      if (
        collection1 instanceof Error ||
        collection2 instanceof Error ||
        collection3 instanceof Error
      ) {
        throw new Error('Failed to create collections');
      }

      await collectionRepository.save(collection1);
      await collectionRepository.save(collection2);
      await collectionRepository.save(collection3);

      // Add URL to library with collection1
      const addResult = await addUrlToLibraryUseCase.execute({
        url,
        collectionIds: [collection1.collectionId.getStringValue()],
        curatorId: curatorId.value,
      });
      expect(addResult.isOk()).toBe(true);
      const urlCardId = addResult.unwrap().urlCardId;

      // Add to collection2 and collection3, remove from collection1
      const updateRequest = {
        cardId: urlCardId,
        curatorId: curatorId.value,
        addToCollections: [
          collection2.collectionId.getStringValue(),
          collection3.collectionId.getStringValue(),
        ],
        removeFromCollections: [collection1.collectionId.getStringValue()],
      };

      const result = await useCase.execute(updateRequest);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.addedToCollections).toHaveLength(2);
      expect(response.removedFromCollections).toHaveLength(1);
      expect(response.addedToCollections).toContain(
        collection2.collectionId.getStringValue(),
      );
      expect(response.addedToCollections).toContain(
        collection3.collectionId.getStringValue(),
      );
      expect(response.removedFromCollections).toContain(
        collection1.collectionId.getStringValue(),
      );
    });
  });

  describe('Combined operations', () => {
    it('should update note and manage collections in same request', async () => {
      const url = 'https://example.com/article';

      // Create collection
      const collection = new CollectionBuilder()
        .withAuthorId(curatorId.value)
        .withName('Test Collection')
        .build();

      if (collection instanceof Error) {
        throw new Error('Failed to create collection');
      }

      await collectionRepository.save(collection);

      // Add URL to library
      const addResult = await addUrlToLibraryUseCase.execute({
        url,
        curatorId: curatorId.value,
      });
      expect(addResult.isOk()).toBe(true);
      const urlCardId = addResult.unwrap().urlCardId;

      // Update note and add to collection
      const updateRequest = {
        cardId: urlCardId,
        curatorId: curatorId.value,
        note: 'My note about this article',
        addToCollections: [collection.collectionId.getStringValue()],
      };

      const result = await useCase.execute(updateRequest);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.noteCardId).toBeDefined();
      expect(response.addedToCollections).toHaveLength(1);
      expect(response.addedToCollections).toContain(
        collection.collectionId.getStringValue(),
      );

      // Verify note was created
      const savedCards = cardRepository.getAllCards();
      const noteCard = savedCards.find(
        (card) => card.content.type === CardTypeEnum.NOTE,
      );
      expect(noteCard).toBeDefined();
      expect(noteCard?.content.noteContent?.text).toBe(
        'My note about this article',
      );
    });
  });

  describe('Publishing failures', () => {
    it('should not save note when card publishing fails', async () => {
      const url = 'https://example.com/article';

      // First, add the URL to the library
      const addResult = await addUrlToLibraryUseCase.execute({
        url,
        curatorId: curatorId.value,
      });
      expect(addResult.isOk()).toBe(true);
      const urlCardId = addResult.unwrap().urlCardId;

      // Get initial card count
      const initialCards = cardRepository.getAllCards();
      const initialCardCount = initialCards.length;

      // Configure card publisher to fail
      cardPublisher.setShouldFail(true);

      const updateRequest = {
        cardId: urlCardId,
        curatorId: curatorId.value,
        note: 'This note should not be saved',
      };

      const result = await useCase.execute(updateRequest);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to publish');
      }

      // Verify no new cards were saved when publishing failed
      const finalCards = cardRepository.getAllCards();
      expect(finalCards).toHaveLength(initialCardCount);

      // Verify no note card was created
      const noteCards = finalCards.filter(
        (card) => card.content.type === CardTypeEnum.NOTE,
      );
      expect(noteCards).toHaveLength(0);
    });

    it('should not save collection associations when collection publishing fails', async () => {
      const url = 'https://example.com/article';

      // Create collection
      const collection = new CollectionBuilder()
        .withAuthorId(curatorId.value)
        .withName('Test Collection')
        .build();

      if (collection instanceof Error) {
        throw new Error('Failed to create collection');
      }

      await collectionRepository.save(collection);

      // Add URL to library
      const addResult = await addUrlToLibraryUseCase.execute({
        url,
        curatorId: curatorId.value,
      });
      expect(addResult.isOk()).toBe(true);
      const urlCardId = addResult.unwrap().urlCardId;

      // Configure collection publisher to fail
      collectionPublisher.setShouldFail(true);

      const updateRequest = {
        cardId: urlCardId,
        curatorId: curatorId.value,
        addToCollections: [collection.collectionId.getStringValue()],
      };

      const result = await useCase.execute(updateRequest);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to publish');
      }

      // Verify no collection links were published
      const publishedLinks = collectionPublisher.getPublishedLinksForCollection(
        collection.collectionId.getStringValue(),
      );
      expect(publishedLinks).toHaveLength(0);
    });
  });

  describe('Validation', () => {
    it('should fail when card does not exist', async () => {
      const request = {
        cardId: 'nonexistent-card-id',
        curatorId: curatorId.value,
        note: 'This should fail',
      };

      const result = await useCase.execute(request);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain(
          'URL card not found. Please add the URL to your library first.',
        );
      }
    });

    it('should fail with invalid curator ID', async () => {
      const url = 'https://example.com/article';

      // Add URL to library first
      const addResult = await addUrlToLibraryUseCase.execute({
        url,
        curatorId: curatorId.value,
      });
      expect(addResult.isOk()).toBe(true);
      const urlCardId = addResult.unwrap().urlCardId;

      const request = {
        cardId: urlCardId,
        curatorId: 'invalid-curator-id',
        note: 'This should fail',
      };

      const result = await useCase.execute(request);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Invalid curator ID');
      }
    });

    it('should fail with invalid collection ID', async () => {
      const url = 'https://example.com/article';

      // Add URL to library
      const addResult = await addUrlToLibraryUseCase.execute({
        url,
        curatorId: curatorId.value,
      });
      expect(addResult.isOk()).toBe(true);
      const urlCardId = addResult.unwrap().urlCardId;

      const request = {
        cardId: urlCardId,
        curatorId: curatorId.value,
        addToCollections: ['invalid-collection-id'],
      };

      const result = await useCase.execute(request);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Collection not found');
      }
    });
  });
});
