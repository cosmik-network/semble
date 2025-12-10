import { RemoveCardFromCollectionUseCase } from '../../application/useCases/commands/RemoveCardFromCollectionUseCase';
import { InMemoryCardRepository } from '../utils/InMemoryCardRepository';
import { InMemoryCollectionRepository } from '../utils/InMemoryCollectionRepository';
import { FakeCollectionPublisher } from '../utils/FakeCollectionPublisher';
import { CardCollectionService } from '../../domain/services/CardCollectionService';
import { CuratorId } from '../../domain/value-objects/CuratorId';
import { CardBuilder } from '../utils/builders/CardBuilder';
import { CollectionBuilder } from '../utils/builders/CollectionBuilder';
import { CardTypeEnum } from '../../domain/value-objects/CardType';

describe('RemoveCardFromCollectionUseCase', () => {
  let useCase: RemoveCardFromCollectionUseCase;
  let cardRepository: InMemoryCardRepository;
  let collectionRepository: InMemoryCollectionRepository;
  let collectionPublisher: FakeCollectionPublisher;
  let cardCollectionService: CardCollectionService;
  let curatorId: CuratorId;
  let otherCuratorId: CuratorId;

  beforeEach(() => {
    cardRepository = InMemoryCardRepository.getInstance();
    collectionRepository = InMemoryCollectionRepository.getInstance();
    collectionPublisher = new FakeCollectionPublisher();
    cardCollectionService = new CardCollectionService(
      collectionRepository,
      collectionPublisher,
      cardRepository,
    );

    useCase = new RemoveCardFromCollectionUseCase(
      cardRepository,
      cardCollectionService,
    );

    curatorId = CuratorId.create('did:plc:testcurator').unwrap();
    otherCuratorId = CuratorId.create('did:plc:othercurator').unwrap();
  });

  afterEach(() => {
    cardRepository.clear();
    collectionRepository.clear();
    collectionPublisher.clear();
  });

  const createCard = async (type: CardTypeEnum = CardTypeEnum.URL) => {
    const card = new CardBuilder().withType(type).build();

    if (card instanceof Error) {
      throw new Error(`Failed to create card: ${card.message}`);
    }

    await cardRepository.save(card);
    return card;
  };

  const createCollection = async (authorId: CuratorId, name: string) => {
    const collection = new CollectionBuilder()
      .withAuthorId(authorId.value)
      .withName(name)
      .withPublished(true)
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

  describe('Basic card removal from collection', () => {
    it('should successfully remove card from collection', async () => {
      const card = await createCard();
      const collection = await createCollection(curatorId, 'Test Collection');

      // Add card to collection first
      await addCardToCollection(card, collection, curatorId);

      const request = {
        cardId: card.cardId.getStringValue(),
        collectionIds: [collection.collectionId.getStringValue()],
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.cardId).toBe(card.cardId.getStringValue());

      // Verify card was removed from collection
      const removedLinks = collectionPublisher.getRemovedLinksForCollection(
        collection.collectionId.getStringValue(),
      );
      expect(removedLinks).toHaveLength(1);
      expect(removedLinks[0]?.cardId).toBe(card.cardId.getStringValue());
    });

    it('should remove card from multiple collections', async () => {
      const card = await createCard();
      const collection1 = await createCollection(curatorId, 'Collection 1');
      const collection2 = await createCollection(curatorId, 'Collection 2');

      // Add card to both collections
      await addCardToCollection(card, collection1, curatorId);
      await addCardToCollection(card, collection2, curatorId);

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

      // Verify card was removed from both collections
      const removedLinks1 = collectionPublisher.getRemovedLinksForCollection(
        collection1.collectionId.getStringValue(),
      );
      const removedLinks2 = collectionPublisher.getRemovedLinksForCollection(
        collection2.collectionId.getStringValue(),
      );

      expect(removedLinks1).toHaveLength(1);
      expect(removedLinks2).toHaveLength(1);
      expect(removedLinks1[0]?.cardId).toBe(card.cardId.getStringValue());
      expect(removedLinks2[0]?.cardId).toBe(card.cardId.getStringValue());
    });

    it("should handle partial removal when some collections don't contain the card", async () => {
      const card = await createCard();
      const collection1 = await createCollection(curatorId, 'Collection 1');
      const collection2 = await createCollection(curatorId, 'Collection 2');

      // Add card to only one collection
      await addCardToCollection(card, collection1, curatorId);

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

      // Verify card was removed from collection1 but no error for collection2
      const removedLinks1 = collectionPublisher.getRemovedLinksForCollection(
        collection1.collectionId.getStringValue(),
      );
      const removedLinks2 = collectionPublisher.getRemovedLinksForCollection(
        collection2.collectionId.getStringValue(),
      );

      expect(removedLinks1).toHaveLength(1);
      expect(removedLinks2).toHaveLength(0);
    });
  });

  describe('Authorization', () => {
    it('should fail when trying to remove card from closed collection without permission', async () => {
      const card = await createCard();
      const collection = new CollectionBuilder()
        .withAuthorId(otherCuratorId.value)
        .withName('Closed Collection')
        .withAccessType('CLOSED')
        .withPublished(true)
        .build();

      if (collection instanceof Error) {
        throw new Error(`Failed to create collection: ${collection.message}`);
      }
      collection.addCard(card.cardId, otherCuratorId);

      await collectionRepository.save(collection);

      const request = {
        cardId: card.cardId.getStringValue(),
        collectionIds: [collection.collectionId.getStringValue()],
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('does not have permission');
      }
    });

    it('should allow removal from open collection by any user', async () => {
      const card = await createCard();
      const collection = new CollectionBuilder()
        .withAuthorId(otherCuratorId.value)
        .withName('Open Collection')
        .withAccessType('OPEN')
        .withPublished(true)
        .build();

      if (collection instanceof Error) {
        throw new Error(`Failed to create collection: ${collection.message}`);
      }

      await collectionRepository.save(collection);

      // Add card to collection first (as collection owner)
      await addCardToCollection(card, collection, otherCuratorId);

      const request = {
        cardId: card.cardId.getStringValue(),
        collectionIds: [collection.collectionId.getStringValue()],
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);
    });

    it('should allow collection author to remove any card', async () => {
      const card = await createCard();
      const collection = await createCollection(
        curatorId,
        "Author's Collection",
      );

      await addCardToCollection(card, collection, curatorId);

      const request = {
        cardId: card.cardId.getStringValue(),
        collectionIds: [collection.collectionId.getStringValue()],
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);
    });
  });

  describe('Validation', () => {
    it('should fail with invalid card ID', async () => {
      const collection = await createCollection(curatorId, 'Test Collection');

      const request = {
        cardId: 'invalid-card-id',
        collectionIds: [collection.collectionId.getStringValue()],
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
      const collection = await createCollection(curatorId, 'Test Collection');

      const request = {
        cardId: card.cardId.getStringValue(),
        collectionIds: [collection.collectionId.getStringValue()],
        curatorId: 'invalid-curator-id',
      };

      const result = await useCase.execute(request);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Invalid curator ID');
      }
    });

    it('should fail with invalid collection ID', async () => {
      const card = await createCard();

      const request = {
        cardId: card.cardId.getStringValue(),
        collectionIds: ['invalid-collection-id'],
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Collection not found');
      }
    });

    it('should fail when card does not exist', async () => {
      const collection = await createCollection(curatorId, 'Test Collection');

      const request = {
        cardId: 'non-existent-card-id',
        collectionIds: [collection.collectionId.getStringValue()],
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Card not found');
      }
    });

    it('should fail when collection does not exist', async () => {
      const card = await createCard();

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

    it('should handle empty collection IDs array', async () => {
      const card = await createCard();

      const request = {
        cardId: card.cardId.getStringValue(),
        collectionIds: [],
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);

      // No removal operations should have occurred
      const allRemovedLinks = collectionPublisher.getAllRemovedLinks();
      expect(allRemovedLinks).toHaveLength(0);
    });
  });

  describe('Edge cases', () => {
    it('should handle removing card that was never in the collection', async () => {
      const card = await createCard();
      const collection = await createCollection(curatorId, 'Empty Collection');

      const request = {
        cardId: card.cardId.getStringValue(),
        collectionIds: [collection.collectionId.getStringValue()],
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);

      // No removal should have occurred
      const removedLinks = collectionPublisher.getRemovedLinksForCollection(
        collection.collectionId.getStringValue(),
      );
      expect(removedLinks).toHaveLength(0);
    });

    it('should handle removing card from same collection multiple times', async () => {
      const card = await createCard();
      const collection = await createCollection(curatorId, 'Test Collection');

      await addCardToCollection(card, collection, curatorId);

      const request = {
        cardId: card.cardId.getStringValue(),
        collectionIds: [collection.collectionId.getStringValue()],
        curatorId: curatorId.value,
      };

      // First removal should succeed
      const firstResult = await useCase.execute(request);
      expect(firstResult.isOk()).toBe(true);

      // Second removal should also succeed (idempotent)
      const secondResult = await useCase.execute(request);
      expect(secondResult.isOk()).toBe(true);

      // Only one removal operation should have been recorded
      const removedLinks = collectionPublisher.getRemovedLinksForCollection(
        collection.collectionId.getStringValue(),
      );
      expect(removedLinks).toHaveLength(1);
    });

    it('should handle different card types', async () => {
      const urlCard = await createCard(CardTypeEnum.URL);
      const noteCard = await createCard(CardTypeEnum.NOTE);
      const collection = await createCollection(curatorId, 'Mixed Collection');

      await addCardToCollection(urlCard, collection, curatorId);
      await addCardToCollection(noteCard, collection, curatorId);

      const request = {
        cardId: urlCard.cardId.getStringValue(),
        collectionIds: [collection.collectionId.getStringValue()],
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);

      // Verify only the URL card was removed
      const removedLinks = collectionPublisher.getRemovedLinksForCollection(
        collection.collectionId.getStringValue(),
      );
      expect(removedLinks).toHaveLength(1);
      expect(removedLinks[0]?.cardId).toBe(urlCard.cardId.getStringValue());
    });

    it('should handle repository errors gracefully', async () => {
      const card = await createCard();
      const collection = await createCollection(curatorId, 'Test Collection');

      // Configure repository to fail
      cardRepository.setShouldFail(true);

      const request = {
        cardId: card.cardId.getStringValue(),
        collectionIds: [collection.collectionId.getStringValue()],
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isErr()).toBe(true);
    });
  });
});
