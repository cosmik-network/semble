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
import { CardAddedToLibraryEvent } from '../../domain/events/CardAddedToLibraryEvent';
import { CardAddedToCollectionEvent } from '../../domain/events/CardAddedToCollectionEvent';
import { EventNames } from 'src/shared/infrastructure/events/EventConfig';
import { err } from 'src/shared/core/Result';

describe('AddUrlToLibraryUseCase', () => {
  let useCase: AddUrlToLibraryUseCase;
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

    useCase = new AddUrlToLibraryUseCase(
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

  describe('Basic URL card creation', () => {
    it('should create and add a URL card to library', async () => {
      const request = {
        url: 'https://example.com/article',
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.urlCardId).toBeDefined();
      expect(response.noteCardId).toBeUndefined();

      // Verify card was saved
      const savedCards = cardRepository.getAllCards();
      expect(savedCards).toHaveLength(1);
      expect(savedCards[0]!.content.type).toBe(CardTypeEnum.URL);

      // Verify card was published to library
      const publishedCards = cardPublisher.getPublishedCards();
      expect(publishedCards).toHaveLength(1);

      // Verify CardAddedToLibraryEvent was published
      const libraryEvents = eventPublisher.getPublishedEventsOfType(
        EventNames.CARD_ADDED_TO_LIBRARY,
      ) as CardAddedToLibraryEvent[];
      expect(libraryEvents).toHaveLength(1);
      expect(libraryEvents[0]?.cardId.getStringValue()).toBe(
        response.urlCardId,
      );
      expect(libraryEvents[0]?.curatorId.equals(curatorId)).toBe(true);
    });

    it('should create URL card with note when note is provided', async () => {
      const request = {
        url: 'https://example.com/article',
        note: 'This is a great article about testing',
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.urlCardId).toBeDefined();
      expect(response.noteCardId).toBeDefined();

      // Verify both cards were saved
      const savedCards = cardRepository.getAllCards();
      expect(savedCards).toHaveLength(2);

      const urlCard = savedCards.find(
        (card) => card.content.type === CardTypeEnum.URL,
      );
      const noteCard = savedCards.find(
        (card) => card.content.type === CardTypeEnum.NOTE,
      );

      expect(urlCard).toBeDefined();
      expect(noteCard).toBeDefined();
      expect(noteCard?.parentCardId?.getStringValue()).toBe(
        urlCard?.cardId.getStringValue(),
      );

      // Verify both cards were published to library
      const publishedCards = cardPublisher.getPublishedCards();
      expect(publishedCards).toHaveLength(2);

      // Verify CardAddedToLibraryEvent was published for only URL card
      const libraryEvents = eventPublisher.getPublishedEventsOfType(
        EventNames.CARD_ADDED_TO_LIBRARY,
      ) as CardAddedToLibraryEvent[];
      expect(libraryEvents).toHaveLength(1);

      const urlCardEvent = libraryEvents.find(
        (event) =>
          event.cardId.getStringValue() === urlCard?.cardId.getStringValue(),
      );

      expect(urlCardEvent).toBeDefined();
      expect(urlCardEvent?.curatorId.equals(curatorId)).toBe(true);
    });
  });

  describe('Existing URL card handling', () => {
    it('should reuse existing URL card instead of creating new one', async () => {
      const url = 'https://example.com/existing';

      // First request creates the URL card
      const firstRequest = {
        url,
        curatorId: curatorId.value,
      };

      const firstResult = await useCase.execute(firstRequest);
      expect(firstResult.isOk()).toBe(true);
      const firstResponse = firstResult.unwrap();

      // Second request should reuse the same URL card
      const secondRequest = {
        url,
        note: 'Adding a note to existing URL',
        curatorId: curatorId.value,
      };

      const secondResult = await useCase.execute(secondRequest);
      expect(secondResult.isOk()).toBe(true);
      const secondResponse = secondResult.unwrap();

      // Should have same URL card ID
      expect(secondResponse.urlCardId).toBe(firstResponse.urlCardId);
      expect(secondResponse.noteCardId).toBeDefined();

      // Should have URL card + note card
      const savedCards = cardRepository.getAllCards();
      expect(savedCards).toHaveLength(2);

      const urlCards = savedCards.filter(
        (card) => card.content.type === CardTypeEnum.URL,
      );
      expect(urlCards).toHaveLength(1); // Only one URL card
    });

    it('should create new URL card when another user has URL card with same URL', async () => {
      const url = 'https://example.com/shared';
      const otherCuratorId = CuratorId.create('did:plc:othercurator').unwrap();

      // First user creates URL card
      const firstRequest = {
        url,
        curatorId: otherCuratorId.value,
      };

      const firstResult = await useCase.execute(firstRequest);
      expect(firstResult.isOk()).toBe(true);
      const firstResponse = firstResult.unwrap();

      // Second user (different curator) should create their own URL card
      const secondRequest = {
        url,
        curatorId: curatorId.value,
      };

      const secondResult = await useCase.execute(secondRequest);
      expect(secondResult.isOk()).toBe(true);
      const secondResponse = secondResult.unwrap();

      // Should have different URL card IDs
      expect(secondResponse.urlCardId).not.toBe(firstResponse.urlCardId);

      // Should have two separate URL cards
      const savedCards = cardRepository.getAllCards();
      expect(savedCards).toHaveLength(2);

      const urlCards = savedCards.filter(
        (card) => card.content.type === CardTypeEnum.URL,
      );
      expect(urlCards).toHaveLength(2); // Two separate URL cards

      // Verify each card belongs to the correct curator
      const firstUserCard = urlCards.find((card) =>
        card.props.curatorId.equals(otherCuratorId),
      );
      const secondUserCard = urlCards.find((card) =>
        card.props.curatorId.equals(curatorId),
      );

      expect(firstUserCard).toBeDefined();
      expect(secondUserCard).toBeDefined();
    });

    it('should create new URL card when no one has URL card with that URL yet', async () => {
      const url = 'https://example.com/brand-new';

      // Verify no cards exist initially
      expect(cardRepository.getAllCards()).toHaveLength(0);

      const request = {
        url,
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.urlCardId).toBeDefined();

      // Verify new URL card was created
      const savedCards = cardRepository.getAllCards();
      expect(savedCards).toHaveLength(1);

      const urlCard = savedCards[0];
      expect(urlCard?.content.type).toBe(CardTypeEnum.URL);
      expect(urlCard?.props.curatorId.equals(curatorId)).toBe(true);
    });

    it('should update existing note card when URL already exists with a note', async () => {
      const url = 'https://example.com/existing';

      // First request creates URL card with note
      const firstRequest = {
        url,
        note: 'Original note',
        curatorId: curatorId.value,
      };

      const firstResult = await useCase.execute(firstRequest);
      expect(firstResult.isOk()).toBe(true);
      const firstResponse = firstResult.unwrap();
      expect(firstResponse.noteCardId).toBeDefined();

      // Get the original note card
      const cardsAfterFirst = cardRepository.getAllCards();
      const originalNoteCard = cardsAfterFirst.find(
        (card) => card.content.type === CardTypeEnum.NOTE,
      );
      expect(originalNoteCard).toBeDefined();
      expect(originalNoteCard?.content.noteContent?.text).toBe('Original note');

      // Second request updates the note
      const secondRequest = {
        url,
        note: 'Updated note',
        curatorId: curatorId.value,
      };

      const secondResult = await useCase.execute(secondRequest);
      expect(secondResult.isOk()).toBe(true);
      const secondResponse = secondResult.unwrap();

      // Should still have the same note card ID
      expect(secondResponse.noteCardId).toBe(firstResponse.noteCardId);

      // Should still have 2 cards (URL + Note)
      const savedCards = cardRepository.getAllCards();
      expect(savedCards).toHaveLength(2);

      // Verify note was updated
      const updatedNoteCard = savedCards.find(
        (card) => card.content.type === CardTypeEnum.NOTE,
      );
      expect(updatedNoteCard).toBeDefined();
      expect(updatedNoteCard?.content.noteContent?.text).toBe('Updated note');
      expect(updatedNoteCard?.cardId.getStringValue()).toBe(
        firstResponse.noteCardId,
      );
    });
  });

  describe('Collection handling', () => {
    it('should add URL card to specified collections', async () => {
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
        url: 'https://example.com/article',
        collectionIds: [collection.collectionId.getStringValue()],
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);

      // Verify collection link was published
      const publishedLinks = collectionPublisher.getPublishedLinksForCollection(
        collection.collectionId.getStringValue(),
      );
      expect(publishedLinks).toHaveLength(1);

      // Verify CardAddedToLibraryEvent was published
      const libraryEvents = eventPublisher.getPublishedEventsOfType(
        EventNames.CARD_ADDED_TO_LIBRARY,
      ) as CardAddedToLibraryEvent[];
      expect(libraryEvents).toHaveLength(1);
      expect(libraryEvents[0]?.curatorId.equals(curatorId)).toBe(true);

      // Verify CardAddedToCollectionEvent was published
      const collectionEvents = eventPublisher.getPublishedEventsOfType(
        EventNames.CARD_ADDED_TO_COLLECTION,
      ) as CardAddedToCollectionEvent[];
      expect(collectionEvents).toHaveLength(1);
      expect(collectionEvents[0]?.collectionId.getStringValue()).toBe(
        collection.collectionId.getStringValue(),
      );
      expect(collectionEvents[0]?.addedBy.equals(curatorId)).toBe(true);
    });

    it('should add URL card (not note card) to collections when note is provided', async () => {
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
        url: 'https://example.com/article',
        note: 'This is my note about the article',
        collectionIds: [collection.collectionId.getStringValue()],
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();

      // Verify both URL and note cards were created
      expect(response.urlCardId).toBeDefined();
      expect(response.noteCardId).toBeDefined();

      // Verify both cards were saved
      const savedCards = cardRepository.getAllCards();
      expect(savedCards).toHaveLength(2);

      const urlCard = savedCards.find(
        (card) => card.content.type === CardTypeEnum.URL,
      );
      const noteCard = savedCards.find(
        (card) => card.content.type === CardTypeEnum.NOTE,
      );

      expect(urlCard).toBeDefined();
      expect(noteCard).toBeDefined();

      // Verify collection link was published for URL card only
      const publishedLinks = collectionPublisher.getPublishedLinksForCollection(
        collection.collectionId.getStringValue(),
      );
      expect(publishedLinks).toHaveLength(1);

      // Verify the published link is for the URL card, not the note card
      const publishedLink = publishedLinks[0];
      expect(publishedLink?.cardId).toBe(urlCard?.cardId.getStringValue());
      expect(publishedLink?.cardId).not.toBe(noteCard?.cardId.getStringValue());

      // Verify both cards are in the library
      const publishedCards = cardPublisher.getPublishedCards();
      expect(publishedCards).toHaveLength(2);

      // Verify CardAddedToLibraryEvent was published for both cards
      const libraryEvents = eventPublisher.getPublishedEventsOfType(
        EventNames.CARD_ADDED_TO_LIBRARY,
      ) as CardAddedToLibraryEvent[];
      expect(libraryEvents).toHaveLength(1);

      // Verify CardAddedToCollectionEvent was published for URL card only
      const collectionEvents = eventPublisher.getPublishedEventsOfType(
        EventNames.CARD_ADDED_TO_COLLECTION,
      ) as CardAddedToCollectionEvent[];
      expect(collectionEvents).toHaveLength(1);
      expect(collectionEvents[0]?.cardId.getStringValue()).toBe(
        urlCard?.cardId.getStringValue(),
      );
      expect(collectionEvents[0]?.collectionId.getStringValue()).toBe(
        collection.collectionId.getStringValue(),
      );
      expect(collectionEvents[0]?.addedBy.equals(curatorId)).toBe(true);
    });

    it('should fail when collection does not exist', async () => {
      const request = {
        url: 'https://example.com/article',
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
    it('should fail with invalid URL', async () => {
      const request = {
        url: 'not-a-valid-url',
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Invalid URL');
      }
    });

    it('should fail with invalid curator ID', async () => {
      const request = {
        url: 'https://example.com/article',
        curatorId: 'invalid-curator-id',
      };

      const result = await useCase.execute(request);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Invalid curator ID');
      }
    });

    it('should fail with invalid collection ID', async () => {
      const request = {
        url: 'https://example.com/article',
        collectionIds: ['invalid-collection-id'],
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Collection not found');
      }
    });
  });

  describe('Metadata service integration', () => {
    it('should handle metadata service failure gracefully', async () => {
      // Configure metadata service to fail
      metadataService.setShouldFail(true);

      const request = {
        url: 'https://example.com/article',
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to fetch metadata');
      }
    });
  });

  describe('Publishing failure scenarios', () => {
    it('should rollback card creation when library publishing fails', async () => {
      // Configure card publisher to fail
      cardPublisher.setShouldFail(true);

      const request = {
        url: 'https://example.com/article',
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain(
          'Failed to publish card to library',
        );
      }

      // Card should be completely rolled back (deleted from repository)
      const savedCards = cardRepository.getAllCards();
      expect(savedCards).toHaveLength(0);

      // Verify card was not published
      const publishedCards = cardPublisher.getPublishedCards();
      expect(publishedCards).toHaveLength(0);

      // Verify no library events were published
      const libraryEvents = eventPublisher.getPublishedEventsOfType(
        EventNames.CARD_ADDED_TO_LIBRARY,
      );
      expect(libraryEvents).toHaveLength(0);
    });

    it('should rollback note card creation when note card library publishing fails', async () => {
      const request = {
        url: 'https://example.com/article',
        note: 'This note will fail to publish',
        curatorId: curatorId.value,
      };

      // Configure card publisher to fail on the second publish call (note card)
      let publishCallCount = 0;
      const originalPublish =
        cardPublisher.publishCardToLibrary.bind(cardPublisher);
      cardPublisher.publishCardToLibrary = jest
        .fn()
        .mockImplementation((card, curatorId, parentCardPublishedRecordId) => {
          publishCallCount++;
          if (publishCallCount === 2) {
            return Promise.resolve(err(new Error('Note card publish failure')));
          }
          return originalPublish(card, curatorId, parentCardPublishedRecordId);
        });

      const result = await useCase.execute(request);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain(
          'Failed to publish card to library',
        );
      }

      // Both cards should be completely rolled back (deleted from repository)
      const savedCards = cardRepository.getAllCards();
      expect(savedCards).toHaveLength(0);

      // Only URL card should have been published before rollback
      const publishedCards = cardPublisher.getPublishedCards();
      expect(publishedCards).toHaveLength(1); // Only URL card published

      // Verify URL card was unpublished during rollback
      const unpublishedCards = cardPublisher.getUnpublishedCards();
      expect(unpublishedCards).toHaveLength(1);
    });

    it('should rollback collection link when collection publishing fails', async () => {
      // Create a test collection
      const collection = new CollectionBuilder()
        .withAuthorId(curatorId.value)
        .withName('Test Collection')
        .build();

      if (collection instanceof Error) {
        throw new Error(`Failed to create collection: ${collection.message}`);
      }

      await collectionRepository.save(collection);

      // Configure collection publisher to fail on link publishing
      collectionPublisher.setShouldFail(true);

      const request = {
        url: 'https://example.com/article',
        collectionIds: [collection.collectionId.getStringValue()],
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain(
          'Failed to publish collection link',
        );
      }

      // Card should be completely rolled back (deleted from repository)
      const savedCards = cardRepository.getAllCards();
      expect(savedCards).toHaveLength(0);

      // Card should have been published then unpublished during rollback
      const publishedCards = cardPublisher.getPublishedCards();
      expect(publishedCards).toHaveLength(1);

      const unpublishedCards = cardPublisher.getUnpublishedCards();
      expect(unpublishedCards).toHaveLength(1);

      // Collection link should not be published
      const publishedLinks = collectionPublisher.getPublishedLinksForCollection(
        collection.collectionId.getStringValue(),
      );
      expect(publishedLinks).toHaveLength(0);

      // No events should be published due to rollback
      const libraryEvents = eventPublisher.getPublishedEventsOfType(
        EventNames.CARD_ADDED_TO_LIBRARY,
      );
      expect(libraryEvents).toHaveLength(0);

      const collectionEvents = eventPublisher.getPublishedEventsOfType(
        EventNames.CARD_ADDED_TO_COLLECTION,
      );
      expect(collectionEvents).toHaveLength(0);
    });

    it('should handle authentication errors during card publishing', async () => {
      // Configure card publisher to fail with authentication error
      cardPublisher.setShouldFail(true);

      const request = {
        url: 'https://example.com/article',
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain(
          'Failed to publish card to library',
        );
      }

      // Card should be completely rolled back (deleted from repository)
      const savedCards = cardRepository.getAllCards();
      expect(savedCards).toHaveLength(0);

      // Verify no cards were published
      const publishedCards = cardPublisher.getPublishedCards();
      expect(publishedCards).toHaveLength(0);
    });

    it('should handle repository save failure after successful card publishing', async () => {
      // Configure repository to fail on save after publishing
      let saveCallCount = 0;
      const originalSave = cardRepository.save.bind(cardRepository);
      cardRepository.save = jest.fn().mockImplementation((card) => {
        saveCallCount++;
        if (saveCallCount === 2) {
          // Fail on second save (after publishing)
          return Promise.resolve(err(new Error('Repository save failure')));
        }
        return originalSave(card);
      });

      const request = {
        url: 'https://example.com/article',
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Repository save failure');
      }

      // Card should still be published even though final save failed
      const publishedCards = cardPublisher.getPublishedCards();
      expect(publishedCards).toHaveLength(1);
    });

    it('should handle partial failure when adding to multiple collections', async () => {
      // Create two test collections
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

      // Configure collection publisher to fail on second collection link
      let linkPublishCallCount = 0;
      const originalPublishLink =
        collectionPublisher.publishCardAddedToCollection.bind(
          collectionPublisher,
        );
      collectionPublisher.publishCardAddedToCollection = jest
        .fn()
        .mockImplementation((card, collection, curatorId) => {
          linkPublishCallCount++;
          if (linkPublishCallCount === 2) {
            return Promise.resolve(
              err(new Error('Second collection link publish failure')),
            );
          }
          return originalPublishLink(card, collection, curatorId);
        });

      const request = {
        url: 'https://example.com/article',
        collectionIds: [
          collection1.collectionId.getStringValue(),
          collection2.collectionId.getStringValue(),
        ],
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain(
          'Failed to publish collection link',
        );
      }

      // Card should be completely rolled back (deleted from repository)
      const savedCards = cardRepository.getAllCards();
      expect(savedCards).toHaveLength(0);

      // Card should have been published then unpublished during rollback
      const publishedCards = cardPublisher.getPublishedCards();
      expect(publishedCards).toHaveLength(1);

      const unpublishedCards = cardPublisher.getUnpublishedCards();
      expect(unpublishedCards).toHaveLength(1);

      // Only first collection link should be published (before rollback)
      const collection1Links =
        collectionPublisher.getPublishedLinksForCollection(
          collection1.collectionId.getStringValue(),
        );
      const collection2Links =
        collectionPublisher.getPublishedLinksForCollection(
          collection2.collectionId.getStringValue(),
        );

      expect(collection1Links).toHaveLength(1);
      expect(collection2Links).toHaveLength(0);

      // No events should be published due to rollback
      const libraryEvents = eventPublisher.getPublishedEventsOfType(
        EventNames.CARD_ADDED_TO_LIBRARY,
      );
      expect(libraryEvents).toHaveLength(0);

      const collectionEvents = eventPublisher.getPublishedEventsOfType(
        EventNames.CARD_ADDED_TO_COLLECTION,
      );
      expect(collectionEvents).toHaveLength(0);
    });
  });
});
