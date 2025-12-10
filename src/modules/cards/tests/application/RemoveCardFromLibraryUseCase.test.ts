import { RemoveCardFromLibraryUseCase } from '../../application/useCases/commands/RemoveCardFromLibraryUseCase';
import { InMemoryCardRepository } from '../utils/InMemoryCardRepository';
import { FakeCardPublisher } from '../utils/FakeCardPublisher';
import { CardLibraryService } from '../../domain/services/CardLibraryService';
import { CuratorId } from '../../domain/value-objects/CuratorId';
import { CardBuilder } from '../utils/builders/CardBuilder';
import { CardTypeEnum } from '../../domain/value-objects/CardType';
import { InMemoryCollectionRepository } from '../utils/InMemoryCollectionRepository';
import { FakeCollectionPublisher } from '../utils/FakeCollectionPublisher';
import { CardCollectionService } from '../../domain/services/CardCollectionService';
import { CollectionBuilder } from '../utils/builders/CollectionBuilder';

describe('RemoveCardFromLibraryUseCase', () => {
  let useCase: RemoveCardFromLibraryUseCase;
  let cardRepository: InMemoryCardRepository;
  let collectionRepository: InMemoryCollectionRepository;
  let cardPublisher: FakeCardPublisher;
  let collectionPublisher: FakeCollectionPublisher;
  let cardCollectionService: CardCollectionService;
  let cardLibraryService: CardLibraryService;
  let curatorId: CuratorId;
  let otherCuratorId: CuratorId;

  beforeEach(() => {
    cardRepository = InMemoryCardRepository.getInstance();
    cardPublisher = new FakeCardPublisher();
    collectionRepository = InMemoryCollectionRepository.getInstance();
    collectionPublisher = new FakeCollectionPublisher();
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

    useCase = new RemoveCardFromLibraryUseCase(
      cardRepository,
      cardLibraryService,
    );

    curatorId = CuratorId.create('did:plc:testcurator').unwrap();
    otherCuratorId = CuratorId.create('did:plc:othercurator').unwrap();
  });

  afterEach(() => {
    cardRepository.clear();
    cardPublisher.clear();
  });

  const createCard = async (
    type: CardTypeEnum = CardTypeEnum.URL,
    creatorId: CuratorId = curatorId,
  ) => {
    const card = new CardBuilder()
      .withType(type)
      .withCuratorId(creatorId.value)
      .build();

    if (card instanceof Error) {
      throw new Error(`Failed to create card: ${card.message}`);
    }

    await cardRepository.save(card);
    return card;
  };

  const addCardToLibrary = async (card: any, curatorId: CuratorId) => {
    // For URL cards, can only add to creator's library
    if (card.isUrlCard && !card.curatorId.equals(curatorId)) {
      throw new Error("URL cards can only be added to creator's library");
    }

    const addResult = await cardLibraryService.addCardToLibrary(
      card,
      curatorId,
    );
    if (addResult.isErr()) {
      throw new Error(
        `Failed to add card to library: ${addResult.error.message}`,
      );
    }
  };

  const createCollection = async (
    curatorId: CuratorId,
    name: string = 'Test Collection',
  ) => {
    const collection = new CollectionBuilder()
      .withAuthorId(curatorId.value)
      .withName(name)
      .build();

    if (collection instanceof Error) {
      throw new Error(`Failed to create collection: ${collection.message}`);
    }

    await collectionRepository.save(collection);
    return collection;
  };

  const addCardToCollection = async (
    card: any,
    collection: any,
    curatorId: CuratorId,
  ) => {
    const addResult = await cardCollectionService.addCardToCollection(
      card,
      collection.collectionId,
      curatorId,
    );
    if (addResult.isErr()) {
      throw new Error(
        `Failed to add card to collection: ${addResult.error.message}`,
      );
    }
  };

  describe('Basic card removal from library', () => {
    it('should successfully remove card from library', async () => {
      const card = await createCard();

      // Add card to library first
      await addCardToLibrary(card, curatorId);

      const request = {
        cardId: card.cardId.getStringValue(),
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.cardId).toBe(card.cardId.getStringValue());

      // Verify card was removed from library and deleted (since it's no longer in any libraries and curator is owner)
      const updatedCardResult = await cardRepository.findById(card.cardId);
      const updatedCard = updatedCardResult.unwrap();
      expect(updatedCard).toBeNull();

      // Verify unpublish operation occurred
      const unpublishedCards = cardPublisher.getUnpublishedCards();
      expect(unpublishedCards).toHaveLength(1);
    });

    it("should remove URL card from creator's library", async () => {
      const card = await createCard();

      // Add card to creator's library only (URL cards can only be in creator's library)
      await addCardToLibrary(card, curatorId);

      const request = {
        cardId: card.cardId.getStringValue(),
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);

      // Verify card was removed from creator's library and deleted (since it's no longer in any libraries and curator is owner)
      const updatedCardResult = await cardRepository.findById(card.cardId);
      const updatedCard = updatedCardResult.unwrap();
      expect(updatedCard).toBeNull();

      // Verify unpublish operation occurred
      const unpublishedCards = cardPublisher.getUnpublishedCards();
      expect(unpublishedCards).toHaveLength(1);
    });

    it('should handle different card types', async () => {
      // Create URL card with curatorId as creator
      const urlCard = await createCard(CardTypeEnum.URL, curatorId);
      // Create note card with curatorId as creator
      const noteCard = await createCard(CardTypeEnum.NOTE, curatorId);

      await addCardToLibrary(urlCard, curatorId);
      await addCardToLibrary(noteCard, curatorId);

      // Remove URL card
      const urlRequest = {
        cardId: urlCard.cardId.getStringValue(),
        curatorId: curatorId.value,
      };

      const urlResult = await useCase.execute(urlRequest);
      expect(urlResult.isOk()).toBe(true);

      // Remove note card
      const noteRequest = {
        cardId: noteCard.cardId.getStringValue(),
        curatorId: curatorId.value,
      };

      const noteResult = await useCase.execute(noteRequest);
      expect(noteResult.isOk()).toBe(true);

      // Verify both cards were removed from library and deleted (since they're no longer in any libraries and curator is owner)
      const updatedUrlCardResult = await cardRepository.findById(
        urlCard.cardId,
      );
      const updatedNoteCardResult = await cardRepository.findById(
        noteCard.cardId,
      );

      const updatedUrlCard = updatedUrlCardResult.unwrap();
      const updatedNoteCard = updatedNoteCardResult.unwrap();

      expect(updatedUrlCard).toBeNull();
      expect(updatedNoteCard).toBeNull();
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
        expect(result.error.message).toContain('Card not found');
      }
    });

    it('should fail with invalid curator ID', async () => {
      const card = await createCard();

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

  describe('Publishing integration', () => {
    it('should unpublish card from library when removed', async () => {
      const card = await createCard();
      await addCardToLibrary(card, curatorId);

      const initialUnpublishCount = cardPublisher.getUnpublishedCards().length;

      const request = {
        cardId: card.cardId.getStringValue(),
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);

      // Verify unpublish operation occurred
      const finalUnpublishCount = cardPublisher.getUnpublishedCards().length;
      expect(finalUnpublishCount).toBe(initialUnpublishCount + 1);

      // Verify the correct card was unpublished
      const unpublishedCards = cardPublisher.getUnpublishedCards();
      const unpublishedCard = unpublishedCards.find(
        (uc) => uc.cardId === card.cardId.getStringValue(),
      );
      expect(unpublishedCard).toBeDefined();
    });

    it('should handle unpublish failure gracefully', async () => {
      const card = await createCard();
      await addCardToLibrary(card, curatorId);

      // Configure publisher to fail unpublish
      cardPublisher.setShouldFailUnpublish(true);

      const request = {
        cardId: card.cardId.getStringValue(),
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isErr()).toBe(true);

      // Verify card was not removed from library if unpublish failed
      const cardResult = await cardRepository.findById(card.cardId);
      const cardFromRepo = cardResult.unwrap()!;
      expect(cardFromRepo.isInLibrary(curatorId)).toBe(true);
    });

    it('should not unpublish if card was never published', async () => {
      const card = await createCard();

      // Manually add to library without publishing
      const addResult = card.addToLibrary(curatorId);
      expect(addResult.isOk()).toBe(true);
      await cardRepository.save(card);

      const initialUnpublishCount = cardPublisher.getUnpublishedCards().length;

      const request = {
        cardId: card.cardId.getStringValue(),
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);

      // Verify no unpublish operation occurred
      const finalUnpublishCount = cardPublisher.getUnpublishedCards().length;
      expect(finalUnpublishCount).toBe(initialUnpublishCount);

      // Verify card was still removed from library and deleted (since it's no longer in any libraries and curator is owner)
      const updatedCardResult = await cardRepository.findById(card.cardId);
      const updatedCard = updatedCardResult.unwrap();
      expect(updatedCard).toBeNull();
    });
  });

  describe('Collection integration', () => {
    it('should remove card from all curator collections when removed from library', async () => {
      const card = await createCard();
      await addCardToLibrary(card, curatorId);

      // Create multiple collections for the curator
      const collection1 = await createCollection(curatorId, 'Collection 1');
      const collection2 = await createCollection(curatorId, 'Collection 2');
      const collection3 = await createCollection(curatorId, 'Collection 3');

      // Add card to all collections
      await addCardToCollection(card, collection1, curatorId);
      await addCardToCollection(card, collection2, curatorId);
      await addCardToCollection(card, collection3, curatorId);

      // Verify card is in all collections
      const initialCollection1Result = await collectionRepository.findById(
        collection1.collectionId,
      );
      const initialCollection2Result = await collectionRepository.findById(
        collection2.collectionId,
      );
      const initialCollection3Result = await collectionRepository.findById(
        collection3.collectionId,
      );

      expect(
        initialCollection1Result
          .unwrap()!
          .cardIds.some((id) => id.equals(card.cardId)),
      ).toBe(true);
      expect(
        initialCollection2Result
          .unwrap()!
          .cardIds.some((id) => id.equals(card.cardId)),
      ).toBe(true);
      expect(
        initialCollection3Result
          .unwrap()!
          .cardIds.some((id) => id.equals(card.cardId)),
      ).toBe(true);

      // Remove card from library
      const request = {
        cardId: card.cardId.getStringValue(),
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);

      // Verify card was removed from library and deleted (since it's no longer in any libraries and curator is owner)
      const updatedCardResult = await cardRepository.findById(card.cardId);
      const updatedCard = updatedCardResult.unwrap();
      expect(updatedCard).toBeNull();

      // Verify card was removed from all collections
      const finalCollection1Result = await collectionRepository.findById(
        collection1.collectionId,
      );
      const finalCollection2Result = await collectionRepository.findById(
        collection2.collectionId,
      );
      const finalCollection3Result = await collectionRepository.findById(
        collection3.collectionId,
      );

      expect(
        finalCollection1Result
          .unwrap()!
          .cardIds.some((id) => id.equals(card.cardId)),
      ).toBe(false);
      expect(
        finalCollection2Result
          .unwrap()!
          .cardIds.some((id) => id.equals(card.cardId)),
      ).toBe(false);
      expect(
        finalCollection3Result
          .unwrap()!
          .cardIds.some((id) => id.equals(card.cardId)),
      ).toBe(false);

      const unpublishedCollectionLinks =
        collectionPublisher.getAllRemovedLinks();
      expect(unpublishedCollectionLinks).toHaveLength(3);
    });

    it('should remove URL card from creator collections only', async () => {
      const card = await createCard();
      await addCardToLibrary(card, curatorId);

      // Create collections for the creator only (URL cards can only be in creator's library)
      const curatorCollection = await createCollection(
        curatorId,
        'Curator Collection',
      );

      // Add card to creator's collection
      await addCardToCollection(card, curatorCollection, curatorId);

      // Remove card from creator's library
      const request = {
        cardId: card.cardId.getStringValue(),
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);

      // Verify card was removed from curator's collection
      const curatorCollectionResult = await collectionRepository.findById(
        curatorCollection.collectionId,
      );

      expect(
        curatorCollectionResult
          .unwrap()!
          .cardIds.some((id) => id.equals(card.cardId)),
      ).toBe(false);

      // Verify card was removed from creator's library and deleted (since it's no longer in any libraries and curator is owner)
      const updatedCardResult = await cardRepository.findById(card.cardId);
      const updatedCard = updatedCardResult.unwrap();
      expect(updatedCard).toBeNull();
    });

    it('should handle card removal when no collections contain the card', async () => {
      const card = await createCard();
      await addCardToLibrary(card, curatorId);

      // Create collections but don't add the card to them
      await createCollection(curatorId, 'Empty Collection 1');
      await createCollection(curatorId, 'Empty Collection 2');

      const request = {
        cardId: card.cardId.getStringValue(),
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);

      // Verify card was removed from library and deleted (since it's no longer in any libraries and curator is owner)
      const updatedCardResult = await cardRepository.findById(card.cardId);
      const updatedCard = updatedCardResult.unwrap();
      expect(updatedCard).toBeNull();

      // Verify no collection unpublish operations occurred
      const unpublishedCollections =
        collectionPublisher.getUnpublishedCollections();
      expect(unpublishedCollections).toHaveLength(0);
    });
  });

  describe('Card deletion behavior', () => {
    it('should delete card when removed from last library and curator is owner', async () => {
      const card = await createCard();
      await addCardToLibrary(card, curatorId);

      // Verify card exists and is in library
      expect(card.isInLibrary(curatorId)).toBe(true);
      expect(card.libraryMembershipCount).toBe(1);

      const request = {
        cardId: card.cardId.getStringValue(),
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);

      // Verify card was deleted
      const cardResult = await cardRepository.findById(card.cardId);
      const cardFromRepo = cardResult.unwrap();
      expect(cardFromRepo).toBeNull();
    });

    it('should not delete card when curator is not the owner', async () => {
      // Create card with different owner
      const card = await createCard(CardTypeEnum.NOTE, otherCuratorId);

      // Add to other curator's library first
      await addCardToLibrary(card, otherCuratorId);

      // Add to current curator's library (note cards can be in multiple libraries)
      await addCardToLibrary(card, curatorId);

      // Remove from current curator's library
      const request = {
        cardId: card.cardId.getStringValue(),
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);

      // Verify card still exists (not deleted because curator is not owner)
      const cardResult = await cardRepository.findById(card.cardId);
      const cardFromRepo = cardResult.unwrap()!;
      expect(cardFromRepo).not.toBeNull();
      expect(cardFromRepo.isInLibrary(curatorId)).toBe(false);
      expect(cardFromRepo.isInLibrary(otherCuratorId)).toBe(true);
    });

    it('should not delete card when it still has other library memberships', async () => {
      // Create note card (can be in multiple libraries)
      const card = await createCard(CardTypeEnum.NOTE, curatorId);

      // Add to both curator's libraries
      await addCardToLibrary(card, curatorId);
      await addCardToLibrary(card, otherCuratorId);

      expect(card.libraryMembershipCount).toBe(2);

      // Remove from curator's library
      const request = {
        cardId: card.cardId.getStringValue(),
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);

      // Verify card still exists (not deleted because it's still in other curator's library)
      const cardResult = await cardRepository.findById(card.cardId);
      const cardFromRepo = cardResult.unwrap()!;
      expect(cardFromRepo).not.toBeNull();
      expect(cardFromRepo.isInLibrary(curatorId)).toBe(false);
      expect(cardFromRepo.isInLibrary(otherCuratorId)).toBe(true);
      expect(cardFromRepo.libraryMembershipCount).toBe(1);
    });
  });

  describe('Edge cases', () => {
    it('should handle URL card with single library membership', async () => {
      // Create URL card with curatorId as creator
      const card = await createCard(CardTypeEnum.URL, curatorId);

      // Add to creator's library only (URL cards can only be in creator's library)
      await addCardToLibrary(card, curatorId);

      expect(card.libraryMembershipCount).toBe(1);

      const request = {
        cardId: card.cardId.getStringValue(),
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);

      // Verify card was deleted (since it's no longer in any libraries and curator is owner)
      const updatedCardResult = await cardRepository.findById(card.cardId);
      const updatedCard = updatedCardResult.unwrap();
      expect(updatedCard).toBeNull();
    });

    it('should handle repository save failure', async () => {
      const card = await createCard();
      await addCardToLibrary(card, curatorId);

      // Configure repository to fail save
      cardRepository.setShouldFailSave(true);

      const request = {
        cardId: card.cardId.getStringValue(),
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isErr()).toBe(true);
    });

    it('should preserve card properties when removing from library', async () => {
      // Create URL card with curatorId as creator
      const card = await createCard(CardTypeEnum.URL, curatorId);
      await addCardToLibrary(card, curatorId);

      const originalCreatedAt = card.createdAt;
      const originalType = card.type.value;
      const originalContent = card.content;

      const request = {
        cardId: card.cardId.getStringValue(),
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);

      // Verify card was deleted (since it's no longer in any libraries and curator is owner)
      const updatedCardResult = await cardRepository.findById(card.cardId);
      const updatedCard = updatedCardResult.unwrap();
      expect(updatedCard).toBeNull();
    });

    it('should delete URL card and associated note card when both have no library memberships', async () => {
      const urlCard = await createCard(CardTypeEnum.URL, curatorId);
      await addCardToLibrary(urlCard, curatorId);

      // Create associated note card
      const noteCard = new CardBuilder()
        .withType(CardTypeEnum.NOTE)
        .withCuratorId(curatorId.value)
        .withParentCard(urlCard.cardId)
        .withUrl(urlCard.url!)
        .build();

      if (noteCard instanceof Error) throw noteCard;

      await cardRepository.save(noteCard);
      await addCardToLibrary(noteCard, curatorId);

      // Remove URL card from library
      const request = {
        cardId: urlCard.cardId.getStringValue(),
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);
      expect(result.isOk()).toBe(true);

      // Verify both cards were deleted
      const urlCardResult = await cardRepository.findById(urlCard.cardId);
      const noteCardResult = await cardRepository.findById(noteCard.cardId);

      expect(urlCardResult.unwrap()).toBeNull();
      expect(noteCardResult.unwrap()).toBeNull();
    });
  });
});
