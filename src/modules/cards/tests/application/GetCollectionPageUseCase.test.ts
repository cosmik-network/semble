import { GetCollectionPageUseCase } from '../../application/useCases/queries/GetCollectionPageUseCase';
import { InMemoryCardQueryRepository } from '../utils/InMemoryCardQueryRepository';
import { InMemoryCardRepository } from '../utils/InMemoryCardRepository';
import { InMemoryCollectionRepository } from '../utils/InMemoryCollectionRepository';
import { FakeProfileService } from '../utils/FakeProfileService';
import { CuratorId } from '../../domain/value-objects/CuratorId';
import { CollectionId } from '../../domain/value-objects/CollectionId';
import { Collection, CollectionAccessType } from '../../domain/Collection';
import { Card } from '../../domain/Card';
import { CardType, CardTypeEnum } from '../../domain/value-objects/CardType';
import { CardContent } from '../../domain/value-objects/CardContent';
import { UrlMetadata } from '../../domain/value-objects/UrlMetadata';
import { URL } from '../../domain/value-objects/URL';
import { CardSortField, SortOrder } from '../../domain/ICardQueryRepository';
import { UniqueEntityID } from '../../../../shared/domain/UniqueEntityID';
import { ICollectionRepository } from '../../domain/ICollectionRepository';
import { InMemoryFollowsRepository } from '../../../user/tests/infrastructure/InMemoryFollowsRepository';

describe('GetCollectionPageUseCase', () => {
  let useCase: GetCollectionPageUseCase;
  let collectionRepo: InMemoryCollectionRepository;
  let cardRepo: InMemoryCardRepository;
  let cardQueryRepo: InMemoryCardQueryRepository;
  let profileService: FakeProfileService;
  let followsRepository: InMemoryFollowsRepository;
  let curatorId: CuratorId;
  let collectionId: CollectionId;

  beforeEach(() => {
    collectionRepo = InMemoryCollectionRepository.getInstance();
    cardRepo = InMemoryCardRepository.getInstance();
    cardQueryRepo = new InMemoryCardQueryRepository(cardRepo, collectionRepo);
    profileService = new FakeProfileService();
    followsRepository = InMemoryFollowsRepository.getInstance();
    useCase = new GetCollectionPageUseCase(
      collectionRepo,
      cardQueryRepo,
      profileService,
      followsRepository,
    );

    curatorId = CuratorId.create('did:plc:testcurator').unwrap();
    collectionId = CollectionId.create(new UniqueEntityID()).unwrap();

    // Set up profile for the curator
    profileService.addProfile({
      id: curatorId.value,
      name: 'Test Curator',
      handle: 'testcurator',
      avatarUrl: 'https://example.com/avatar.jpg',
      bio: 'Test curator bio',
    });
  });

  afterEach(() => {
    collectionRepo.clear();
    cardRepo.clear();
    cardQueryRepo.clear();
    profileService.clear();
  });

  describe('Basic functionality', () => {
    it('should return collection page with empty cards when collection has no cards', async () => {
      // Create collection
      const collection = Collection.create(
        {
          authorId: curatorId,
          name: 'Empty Collection',
          description: 'A collection with no cards',
          accessType: CollectionAccessType.OPEN,
          collaboratorIds: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        collectionId.getValue(),
      ).unwrap();

      await collectionRepo.save(collection);

      const query = {
        collectionId: collectionId.getStringValue(),
      };

      const result = await useCase.execute(query);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.id).toBe(collectionId.getStringValue());
      expect(response.name).toBe('Empty Collection');
      expect(response.description).toBe('A collection with no cards');
      expect(response.author.id).toBe(curatorId.value);
      expect(response.author.name).toBe('Test Curator');
      expect(response.author.handle).toBe('testcurator');
      expect(response.author.avatarUrl).toBe('https://example.com/avatar.jpg');
      expect(response.urlCards).toHaveLength(0);
      expect(response.pagination.totalCount).toBe(0);
      expect(response.pagination.currentPage).toBe(1);
      expect(response.pagination.hasMore).toBe(false);
    });

    it('should return collection page with URL cards', async () => {
      // Create collection
      const collection = Collection.create(
        {
          authorId: curatorId,
          name: 'Test Collection',
          accessType: CollectionAccessType.OPEN,
          collaboratorIds: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        collectionId.getValue(),
      ).unwrap();

      // Create first URL card
      const urlMetadata1 = UrlMetadata.create({
        url: 'https://example.com/article1',
        title: 'First Article',
        description: 'Description of first article',
        author: 'John Doe',
        imageUrl: 'https://example.com/thumb1.jpg',
      }).unwrap();

      const url1 = URL.create('https://example.com/article1').unwrap();
      const cardType1 = CardType.create(CardTypeEnum.URL).unwrap();
      const cardContent1 = CardContent.createUrlContent(
        url1,
        urlMetadata1,
      ).unwrap();

      const card1Result = Card.create({
        curatorId: curatorId,
        type: cardType1,
        content: cardContent1,
        url: url1,
        libraryMemberships: [],
        libraryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      if (card1Result.isErr()) {
        throw card1Result.error;
      }

      const card1 = card1Result.value;
      await cardRepo.save(card1);

      // Create second URL card
      const urlMetadata2 = UrlMetadata.create({
        url: 'https://example.com/article2',
        title: 'Second Article',
        description: 'Description of second article',
        author: 'Jane Smith',
      }).unwrap();

      const url2 = URL.create('https://example.com/article2').unwrap();
      const cardType2 = CardType.create(CardTypeEnum.URL).unwrap();
      const cardContent2 = CardContent.createUrlContent(
        url2,
        urlMetadata2,
      ).unwrap();

      const card2Result = Card.create({
        curatorId: curatorId,
        type: cardType2,
        content: cardContent2,
        url: url2,
        libraryMemberships: [],
        libraryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      if (card2Result.isErr()) {
        throw card2Result.error;
      }

      const card2 = card2Result.value;
      await cardRepo.save(card2);

      // Add cards to collection
      collection.addCard(card1.cardId, curatorId);
      collection.addCard(card2.cardId, curatorId);
      await collectionRepo.save(collection);

      const query = {
        collectionId: collectionId.getStringValue(),
      };

      const result = await useCase.execute(query);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.urlCards).toHaveLength(2);
      expect(response.pagination.totalCount).toBe(2);

      // Verify card data
      const firstCard = response.urlCards.find(
        (card) => card.url === 'https://example.com/article1',
      );
      const secondCard = response.urlCards.find(
        (card) => card.url === 'https://example.com/article2',
      );

      expect(firstCard).toBeDefined();
      expect(firstCard?.cardContent.title).toBe('First Article');
      expect(firstCard?.cardContent.author).toBe('John Doe');

      expect(secondCard).toBeDefined();
      expect(secondCard?.cardContent.title).toBe('Second Article');
    });

    it('should include notes in URL cards', async () => {
      // Create collection
      const collection = Collection.create(
        {
          authorId: curatorId,
          name: 'Collection with Notes',
          accessType: CollectionAccessType.OPEN,
          collaboratorIds: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        collectionId.getValue(),
      ).unwrap();

      // Create URL card
      const urlMetadata = UrlMetadata.create({
        url: 'https://example.com/article-with-note',
        title: 'Article with Note',
        description: 'An article with an associated note',
      }).unwrap();

      const url = URL.create('https://example.com/article-with-note').unwrap();
      const cardType = CardType.create(CardTypeEnum.URL).unwrap();
      const cardContent = CardContent.createUrlContent(
        url,
        urlMetadata,
      ).unwrap();

      const cardResult = Card.create({
        curatorId: curatorId,
        type: cardType,
        content: cardContent,
        url: url,
        libraryMemberships: [],
        libraryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      if (cardResult.isErr()) {
        throw cardResult.error;
      }

      const card = cardResult.value;
      await cardRepo.save(card);

      // Create a note card that references the same URL
      const noteCardResult = Card.create({
        curatorId: curatorId,
        type: CardType.create(CardTypeEnum.NOTE).unwrap(),
        content: CardContent.createNoteContent(
          'This is my note about the article',
        ).unwrap(),
        parentCardId: card.cardId,
        url: url,
        libraryMemberships: [],
        libraryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      if (noteCardResult.isErr()) {
        throw noteCardResult.error;
      }

      const noteCard = noteCardResult.value;
      await cardRepo.save(noteCard);

      // Add card to collection
      collection.addCard(card.cardId, curatorId);
      await collectionRepo.save(collection);

      const query = {
        collectionId: collectionId.getStringValue(),
      };

      const result = await useCase.execute(query);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.urlCards).toHaveLength(1);

      const responseCard = response.urlCards[0]!;
      expect(responseCard.cardContent.title).toBe('Article with Note');
      expect(responseCard.note).toBeDefined();
      expect(responseCard.note?.text).toBe('This is my note about the article');
    });

    it('should handle collection without description', async () => {
      // Create collection without description
      const collection = Collection.create(
        {
          authorId: curatorId,
          name: 'No Description Collection',
          accessType: CollectionAccessType.OPEN,
          collaboratorIds: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        collectionId.getValue(),
      ).unwrap();

      await collectionRepo.save(collection);

      const query = {
        collectionId: collectionId.getStringValue(),
      };

      const result = await useCase.execute(query);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.description).toBeUndefined();
    });
  });

  describe('Pagination', () => {
    beforeEach(async () => {
      // Create collection
      const collection = Collection.create(
        {
          authorId: curatorId,
          name: 'Large Collection',
          accessType: CollectionAccessType.OPEN,
          collaboratorIds: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        collectionId.getValue(),
      ).unwrap();

      await collectionRepo.save(collection);

      // Create multiple URL cards for pagination testing
      for (let i = 1; i <= 5; i++) {
        const urlMetadata = UrlMetadata.create({
          url: `https://example.com/article${i}`,
          title: `Article ${i}`,
          description: `Description of article ${i}`,
        }).unwrap();

        const url = URL.create(`https://example.com/article${i}`).unwrap();
        const cardType = CardType.create(CardTypeEnum.URL).unwrap();
        const cardContent = CardContent.createUrlContent(
          url,
          urlMetadata,
        ).unwrap();

        const cardResult = Card.create({
          curatorId: curatorId,
          type: cardType,
          content: cardContent,
          url: url,
          libraryMemberships: [],
          libraryCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        if (cardResult.isErr()) {
          throw cardResult.error;
        }

        const card = cardResult.value;
        await cardRepo.save(card);

        // Add card to collection
        collection.addCard(card.cardId, curatorId);
      }

      await collectionRepo.save(collection);
    });

    it('should handle pagination correctly', async () => {
      const query = {
        collectionId: collectionId.getStringValue(),
        page: 1,
        limit: 2,
      };

      const result = await useCase.execute(query);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.urlCards).toHaveLength(2);
      expect(response.pagination.currentPage).toBe(1);
      expect(response.pagination.totalPages).toBe(3);
      expect(response.pagination.totalCount).toBe(5);
      expect(response.pagination.hasMore).toBe(true);
      expect(response.pagination.limit).toBe(2);
    });

    it('should handle second page correctly', async () => {
      const query = {
        collectionId: collectionId.getStringValue(),
        page: 2,
        limit: 2,
      };

      const result = await useCase.execute(query);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.urlCards).toHaveLength(2);
      expect(response.pagination.currentPage).toBe(2);
      expect(response.pagination.hasMore).toBe(true);
    });

    it('should handle last page correctly', async () => {
      const query = {
        collectionId: collectionId.getStringValue(),
        page: 3,
        limit: 2,
      };

      const result = await useCase.execute(query);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.urlCards).toHaveLength(1);
      expect(response.pagination.currentPage).toBe(3);
      expect(response.pagination.hasMore).toBe(false);
    });

    it('should cap limit at 100', async () => {
      const query = {
        collectionId: collectionId.getStringValue(),
        limit: 150, // Should be capped at 100
      };

      const result = await useCase.execute(query);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.pagination.limit).toBe(100);
    });
  });

  describe('Sorting', () => {
    beforeEach(async () => {
      // Create collection
      const collection = Collection.create(
        {
          authorId: curatorId,
          name: 'Sortable Collection',
          accessType: CollectionAccessType.OPEN,
          collaboratorIds: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        collectionId.getValue(),
      ).unwrap();

      await collectionRepo.save(collection);

      // Create URL cards with different properties for sorting
      const now = new Date();

      // Create Alpha card (oldest created, middle updated)
      const alphaMetadata = UrlMetadata.create({
        url: 'https://example.com/alpha',
        title: 'Alpha Article',
      }).unwrap();

      const alphaUrl = URL.create('https://example.com/alpha').unwrap();
      const alphaCardType = CardType.create(CardTypeEnum.URL).unwrap();
      const alphaCardContent = CardContent.createUrlContent(
        alphaUrl,
        alphaMetadata,
      ).unwrap();

      const alphaCardResult = Card.create({
        curatorId: curatorId,
        type: alphaCardType,
        content: alphaCardContent,
        url: alphaUrl,
        libraryMemberships: [
          { curatorId: curatorId, addedAt: new Date(now.getTime() - 5000) },
        ],
        libraryCount: 1,
        createdAt: new Date(now.getTime() - 3000), // oldest
        updatedAt: new Date(now.getTime() - 1000), // middle
      });

      if (alphaCardResult.isErr()) {
        throw alphaCardResult.error;
      }

      await cardRepo.save(alphaCardResult.value);

      // Create Beta card (middle created, oldest updated)
      const betaMetadata = UrlMetadata.create({
        url: 'https://example.com/beta',
        title: 'Beta Article',
      }).unwrap();

      const betaUrl = URL.create('https://example.com/beta').unwrap();
      const betaCardType = CardType.create(CardTypeEnum.URL).unwrap();
      const betaCardContent = CardContent.createUrlContent(
        betaUrl,
        betaMetadata,
      ).unwrap();

      const betaCardResult = Card.create({
        curatorId: curatorId,
        type: betaCardType,
        content: betaCardContent,
        url: betaUrl,
        libraryMemberships: [
          { curatorId: curatorId, addedAt: new Date(now.getTime() - 5000) },
        ],
        libraryCount: 1,
        createdAt: new Date(now.getTime() - 2000), // middle
        updatedAt: new Date(now.getTime() - 3000), // oldest
      });

      if (betaCardResult.isErr()) {
        throw betaCardResult.error;
      }

      await cardRepo.save(betaCardResult.value);

      // Create Gamma card (newest created, newest updated)
      const gammaMetadata = UrlMetadata.create({
        url: 'https://example.com/gamma',
        title: 'Gamma Article',
      }).unwrap();

      const gammaUrl = URL.create('https://example.com/gamma').unwrap();
      const gammaCardType = CardType.create(CardTypeEnum.URL).unwrap();
      const gammaCardContent = CardContent.createUrlContent(
        gammaUrl,
        gammaMetadata,
      ).unwrap();

      const gammaCardResult = Card.create({
        curatorId: curatorId,
        type: gammaCardType,
        content: gammaCardContent,
        url: gammaUrl,
        libraryMemberships: [
          { curatorId: curatorId, addedAt: new Date(now.getTime() - 3000) },
        ],
        libraryCount: 1,
        createdAt: new Date(now.getTime() - 1000), // newest
        updatedAt: new Date(now.getTime()), // newest
      });

      if (gammaCardResult.isErr()) {
        throw gammaCardResult.error;
      }

      await cardRepo.save(gammaCardResult.value);

      // Add all cards to collection
      collection.addCard(alphaCardResult.value.cardId, curatorId);
      collection.addCard(betaCardResult.value.cardId, curatorId);
      collection.addCard(gammaCardResult.value.cardId, curatorId);
      await collectionRepo.save(collection);
    });

    it('should sort by updated date descending', async () => {
      const query = {
        collectionId: collectionId.getStringValue(),
        sortBy: CardSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
      };

      const result = await useCase.execute(query);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.urlCards[0]?.cardContent.title).toBe('Gamma Article'); // newest updated
      expect(response.urlCards[1]?.cardContent.title).toBe('Alpha Article'); // middle updated
      expect(response.urlCards[2]?.cardContent.title).toBe('Beta Article'); // oldest updated
    });

    it('should sort by created date ascending', async () => {
      const query = {
        collectionId: collectionId.getStringValue(),
        sortBy: CardSortField.CREATED_AT,
        sortOrder: SortOrder.ASC,
      };

      const result = await useCase.execute(query);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.urlCards[0]?.cardContent.title).toBe('Alpha Article'); // oldest created
      expect(response.urlCards[1]?.cardContent.title).toBe('Beta Article'); // middle created
      expect(response.urlCards[2]?.cardContent.title).toBe('Gamma Article'); // newest created
    });

    it('should sort by library count (all URL cards have same count)', async () => {
      const query = {
        collectionId: collectionId.getStringValue(),
        sortBy: CardSortField.LIBRARY_COUNT,
        sortOrder: SortOrder.DESC,
      };

      const result = await useCase.execute(query);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.urlCards).toHaveLength(3);
      // All URL cards have library count of 1 (only creator's library)
      expect(response.urlCards[0]?.libraryCount).toBe(1);
      expect(response.urlCards[1]?.libraryCount).toBe(1);
      expect(response.urlCards[2]?.libraryCount).toBe(1);
      expect(response.sorting.sortBy).toBe(CardSortField.LIBRARY_COUNT);
      expect(response.sorting.sortOrder).toBe(SortOrder.DESC);
    });

    it('should use default sorting when not specified', async () => {
      const query = {
        collectionId: collectionId.getStringValue(),
      };

      const result = await useCase.execute(query);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.sorting.sortBy).toBe(CardSortField.UPDATED_AT);
      expect(response.sorting.sortOrder).toBe(SortOrder.DESC);
    });
  });

  describe('Error handling', () => {
    it('should fail with invalid collection ID', async () => {
      const query = {
        collectionId: 'invalid-collection-id',
      };

      const result = await useCase.execute(query);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Collection not found');
      }
    });

    it('should fail when collection not found', async () => {
      const nonExistentCollectionId = CollectionId.create(
        new UniqueEntityID(),
      ).unwrap();

      const query = {
        collectionId: nonExistentCollectionId.getStringValue(),
      };

      const result = await useCase.execute(query);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Collection not found');
      }
    });

    it('should fail when author profile not found', async () => {
      // Create collection with author that has no profile
      const unknownCuratorId = CuratorId.create(
        'did:plc:unknowncurator',
      ).unwrap();
      const collection = Collection.create(
        {
          authorId: unknownCuratorId,
          name: 'Orphaned Collection',
          accessType: CollectionAccessType.OPEN,
          collaboratorIds: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        collectionId.getValue(),
      ).unwrap();

      await collectionRepo.save(collection);

      const query = {
        collectionId: collectionId.getStringValue(),
      };

      const result = await useCase.execute(query);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain(
          'Failed to fetch author profile',
        );
      }
    });

    it('should handle repository errors gracefully', async () => {
      // Create a mock collection repository that throws an error
      const errorCollectionRepo: ICollectionRepository = {
        findById: jest
          .fn()
          .mockRejectedValue(new Error('Database connection failed')),
        findByIds: jest.fn(),
        save: jest.fn(),
        delete: jest.fn(),
        findByCuratorId: jest.fn(),
        findByCardId: jest.fn(),
        findByCuratorIdContainingCard: jest.fn(),
        findContainingCardAddedBy: jest.fn(),
      };

      const errorUseCase = new GetCollectionPageUseCase(
        errorCollectionRepo,
        cardQueryRepo,
        profileService,
        followsRepository,
      );

      const query = {
        collectionId: collectionId.getStringValue(),
      };

      const result = await errorUseCase.execute(query);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain(
          'Failed to retrieve collection page',
        );
        expect(result.error.message).toContain('Database connection failed');
      }
    });

    it('should handle card query repository errors gracefully', async () => {
      // Create collection
      const collection = Collection.create(
        {
          authorId: curatorId,
          name: 'Test Collection',
          accessType: CollectionAccessType.OPEN,
          collaboratorIds: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        collectionId.getValue(),
      ).unwrap();

      await collectionRepo.save(collection);

      // Create a mock card query repository that throws an error
      const errorCardQueryRepo = {
        getUrlCardsOfUser: jest.fn(),
        getCardsInCollection: jest
          .fn()
          .mockRejectedValue(new Error('Query failed')),
        getUrlCardView: jest.fn(),
        getUrlCardBasic: jest.fn(),
        getLibrariesForCard: jest.fn(),
        getLibrariesForUrl: jest.fn(),
        getNoteCardsForUrl: jest.fn(),
        getBatchUrlCardViews: jest.fn(),
        getBatchUrlLibraryInfo: jest.fn(),
        searchUrls: jest.fn(),
      };

      const errorUseCase = new GetCollectionPageUseCase(
        collectionRepo,
        errorCardQueryRepo,
        profileService,
        followsRepository,
      );

      const query = {
        collectionId: collectionId.getStringValue(),
      };

      const result = await errorUseCase.execute(query);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain(
          'Failed to retrieve collection page',
        );
        expect(result.error.message).toContain('Query failed');
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle URL cards with minimal metadata', async () => {
      // Create collection
      const collection = Collection.create(
        {
          authorId: curatorId,
          name: 'Minimal Collection',
          accessType: CollectionAccessType.OPEN,
          collaboratorIds: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        collectionId.getValue(),
      ).unwrap();

      await collectionRepo.save(collection);

      // Create URL card with minimal metadata
      const url = URL.create('https://example.com/minimal').unwrap();
      const cardType = CardType.create(CardTypeEnum.URL).unwrap();
      const cardContent = CardContent.createUrlContent(url).unwrap();

      const cardResult = Card.create({
        curatorId: curatorId,
        type: cardType,
        content: cardContent,
        url: url,
        libraryMemberships: [{ curatorId: curatorId, addedAt: new Date() }],
        libraryCount: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      if (cardResult.isErr()) {
        throw cardResult.error;
      }

      const card = cardResult.value;
      await cardRepo.save(card);

      // Add card to collection
      collection.addCard(card.cardId, curatorId);
      await collectionRepo.save(collection);

      const query = {
        collectionId: collectionId.getStringValue(),
      };

      const result = await useCase.execute(query);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.urlCards).toHaveLength(1);
      expect(response.urlCards[0]?.cardContent.title).toBeUndefined();
      expect(response.urlCards[0]?.cardContent.description).toBeUndefined();
      expect(response.urlCards[0]?.cardContent.author).toBeUndefined();
      expect(response.urlCards[0]?.cardContent.imageUrl).toBeUndefined();
    });

    it('should handle author profile with minimal data', async () => {
      // Create curator with minimal profile
      const minimalCuratorId = CuratorId.create(
        'did:plc:minimalcurator',
      ).unwrap();
      profileService.addProfile({
        id: minimalCuratorId.value,
        name: 'Minimal Curator',
        handle: 'minimal',
        // No avatarUrl or bio
      });

      const collection = Collection.create(
        {
          authorId: minimalCuratorId,
          name: 'Minimal Author Collection',
          accessType: CollectionAccessType.OPEN,
          collaboratorIds: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        collectionId.getValue(),
      ).unwrap();

      await collectionRepo.save(collection);

      const query = {
        collectionId: collectionId.getStringValue(),
      };

      const result = await useCase.execute(query);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.author.name).toBe('Minimal Curator');
      expect(response.author.handle).toBe('minimal');
      expect(response.author.avatarUrl).toBeUndefined();
    });
  });
});
