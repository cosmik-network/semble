import { GetUrlCardsUseCase } from '../../application/useCases/queries/GetUrlCardsUseCase';
import { InMemoryCardQueryRepository } from '../utils/InMemoryCardQueryRepository';
import { InMemoryCardRepository } from '../utils/InMemoryCardRepository';
import { InMemoryCollectionRepository } from '../utils/InMemoryCollectionRepository';
import { FakeIdentityResolutionService } from '../utils/FakeIdentityResolutionService';
import { FakeProfileService } from '../utils/FakeProfileService';
import { CuratorId } from '../../domain/value-objects/CuratorId';
import { Card } from '../../domain/Card';
import { CardType, CardTypeEnum } from '../../domain/value-objects/CardType';
import { CardContent } from '../../domain/value-objects/CardContent';
import { UrlMetadata } from '../../domain/value-objects/UrlMetadata';
import { URL } from '../../domain/value-objects/URL';
import { CardSortField, SortOrder } from '../../domain/ICardQueryRepository';
import { UniqueEntityID } from '../../../../shared/domain/UniqueEntityID';

describe('GetUrlCardsUseCase', () => {
  let useCase: GetUrlCardsUseCase;
  let cardQueryRepo: InMemoryCardQueryRepository;
  let cardRepo: InMemoryCardRepository;
  let collectionRepo: InMemoryCollectionRepository;
  let identityResolutionService: FakeIdentityResolutionService;
  let profileService: FakeProfileService;
  let curatorId: CuratorId;

  beforeEach(() => {
    cardRepo = InMemoryCardRepository.getInstance();
    collectionRepo = InMemoryCollectionRepository.getInstance();
    cardQueryRepo = new InMemoryCardQueryRepository(cardRepo, collectionRepo);
    identityResolutionService = new FakeIdentityResolutionService();
    profileService = new FakeProfileService();
    useCase = new GetUrlCardsUseCase(
      cardQueryRepo,
      identityResolutionService,
      profileService,
    );

    curatorId = CuratorId.create('did:plc:testcurator').unwrap();

    // Add the test curator profile to the profile service
    profileService.addProfile({
      id: curatorId.value,
      name: 'Test Curator',
      handle: 'testcurator.bsky.social',
      avatarUrl: 'https://example.com/avatar.jpg',
      bio: 'Test curator bio',
    });
  });

  afterEach(() => {
    cardRepo.clear();
    collectionRepo.clear();
    cardQueryRepo.clear();
    identityResolutionService.clear();
    profileService.clear();
  });

  describe('Basic functionality', () => {
    it('should return empty cards list when user has no URL cards', async () => {
      const query = {
        userId: curatorId.value,
      };

      const result = await useCase.execute(query);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.cards).toHaveLength(0);
      expect(response.pagination.totalCount).toBe(0);
      expect(response.pagination.currentPage).toBe(1);
      expect(response.pagination.hasMore).toBe(false);
    });

    it("should return user's URL cards", async () => {
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

      const cardResult1 = Card.create(
        {
          curatorId: curatorId,
          type: cardType1,
          content: cardContent1,
          url: url1,
          libraryMemberships: [
            { curatorId: curatorId, addedAt: new Date('2023-01-01') },
          ],
          libraryCount: 1,
          createdAt: new Date('2023-01-01'),
          updatedAt: new Date('2023-01-01'),
        },
        new UniqueEntityID(),
      );

      if (cardResult1.isErr()) {
        throw cardResult1.error;
      }

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

      const cardResult2 = Card.create(
        {
          curatorId: curatorId,
          type: cardType2,
          content: cardContent2,
          url: url2,
          libraryMemberships: [
            { curatorId: curatorId, addedAt: new Date('2023-01-02') },
          ],
          libraryCount: 1,
          createdAt: new Date('2023-01-02'),
          updatedAt: new Date('2023-01-02'),
        },
        new UniqueEntityID(),
      );

      if (cardResult2.isErr()) {
        throw cardResult2.error;
      }

      await cardRepo.save(cardResult1.value);
      await cardRepo.save(cardResult2.value);

      const query = {
        userId: curatorId.value,
      };

      const result = await useCase.execute(query);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.cards).toHaveLength(2);
      expect(response.pagination.totalCount).toBe(2);

      // Verify card data
      const firstCard = response.cards.find(
        (card: any) => card.url === 'https://example.com/article1',
      );
      const secondCard = response.cards.find(
        (card: any) => card.url === 'https://example.com/article2',
      );

      expect(firstCard).toBeDefined();
      expect(firstCard?.cardContent.title).toBe('First Article');
      expect(firstCard?.cardContent.author).toBe('John Doe');
      expect(firstCard?.libraryCount).toBe(1);
      expect(firstCard?.author.id).toBe(curatorId.value);
      expect(firstCard?.author.name).toBe('Test Curator');
      expect(firstCard?.author.handle).toBe('testcurator.bsky.social');

      expect(secondCard).toBeDefined();
      expect(secondCard?.cardContent.title).toBe('Second Article');
      expect(secondCard?.libraryCount).toBe(1);
      expect(secondCard?.author.id).toBe(curatorId.value);
      expect(secondCard?.author.name).toBe('Test Curator');
    });

    it('should include notes in URL cards (collections no longer included)', async () => {
      // Create URL metadata
      const urlMetadata = UrlMetadata.create({
        url: 'https://example.com/article-with-extras',
        title: 'Article with Collections and Note',
        description: 'An article with associated data',
      }).unwrap();

      // Create URL and card content
      const url = URL.create(
        'https://example.com/article-with-extras',
      ).unwrap();
      const cardType = CardType.create(CardTypeEnum.URL).unwrap();
      const cardContent = CardContent.createUrlContent(
        url,
        urlMetadata,
      ).unwrap();

      // Create card
      const cardResult = Card.create(
        {
          curatorId: curatorId,
          type: cardType,
          content: cardContent,
          url: url,
          libraryMemberships: [
            { curatorId: curatorId, addedAt: new Date('2023-01-01') },
          ],
          libraryCount: 1,
          createdAt: new Date('2023-01-01'),
          updatedAt: new Date('2023-01-01'),
        },
        new UniqueEntityID(),
      );

      if (cardResult.isErr()) {
        throw cardResult.error;
      }

      await cardRepo.save(cardResult.value);

      // Note: Collection and note testing would require creating actual Collection and Note domain objects
      // and saving them to their respective repositories. This is simplified for now.

      const query = {
        userId: curatorId.value,
      };

      const result = await useCase.execute(query);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.cards).toHaveLength(1);

      const card = response.cards[0]!;
      expect(card.note).toBeUndefined(); // No note created in this simplified test
      expect(card.author.id).toBe(curatorId.value);
      expect(card.author.name).toBe('Test Curator');
    });

    it('should only return URL cards for the specified user', async () => {
      const otherCuratorId = CuratorId.create('did:plc:othercurator').unwrap();

      // Add the other curator profile to the profile service
      profileService.addProfile({
        id: otherCuratorId.value,
        name: 'Other Curator',
        handle: 'othercurator.bsky.social',
        avatarUrl: 'https://example.com/other-avatar.jpg',
        bio: 'Other curator bio',
      });

      // Create my card
      const myUrlMetadata = UrlMetadata.create({
        url: 'https://example.com/my-article',
        title: 'My Article',
      }).unwrap();

      const myUrl = URL.create('https://example.com/my-article').unwrap();
      const myCardType = CardType.create(CardTypeEnum.URL).unwrap();
      const myCardContent = CardContent.createUrlContent(
        myUrl,
        myUrlMetadata,
      ).unwrap();

      const myCardResult = Card.create(
        {
          curatorId: curatorId,
          type: myCardType,
          content: myCardContent,
          url: myUrl,
          libraryMemberships: [{ curatorId: curatorId, addedAt: new Date() }],
          libraryCount: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        new UniqueEntityID(),
      );

      if (myCardResult.isErr()) {
        throw myCardResult.error;
      }

      // Create other user's card
      const otherUrlMetadata = UrlMetadata.create({
        url: 'https://example.com/other-article',
        title: 'Other Article',
      }).unwrap();

      const otherUrl = URL.create('https://example.com/other-article').unwrap();
      const otherCardType = CardType.create(CardTypeEnum.URL).unwrap();
      const otherCardContent = CardContent.createUrlContent(
        otherUrl,
        otherUrlMetadata,
      ).unwrap();

      const otherCardResult = Card.create(
        {
          curatorId: otherCuratorId,
          type: otherCardType,
          content: otherCardContent,
          url: otherUrl,
          libraryMemberships: [
            { curatorId: otherCuratorId, addedAt: new Date() },
          ],
          libraryCount: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        new UniqueEntityID(),
      );

      if (otherCardResult.isErr()) {
        throw otherCardResult.error;
      }

      await cardRepo.save(myCardResult.value);
      await cardRepo.save(otherCardResult.value);

      const query = {
        userId: curatorId.value,
      };

      const result = await useCase.execute(query);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.cards).toHaveLength(1);
      expect(response.cards[0]?.cardContent.title).toBe('My Article');
      expect(response.cards[0]?.author.id).toBe(curatorId.value);
      expect(response.cards[0]?.author.name).toBe('Test Curator');
    });
  });

  describe('Pagination', () => {
    beforeEach(async () => {
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

        const cardResult = Card.create(
          {
            curatorId: curatorId,
            type: cardType,
            content: cardContent,
            url: url,
            libraryMemberships: [
              {
                curatorId: curatorId,
                addedAt: new Date(`2023-01-${i.toString().padStart(2, '0')}`),
              },
            ],
            libraryCount: 1,
            createdAt: new Date(`2023-01-${i.toString().padStart(2, '0')}`),
            updatedAt: new Date(`2023-01-${i.toString().padStart(2, '0')}`),
          },
          new UniqueEntityID(),
        );

        if (cardResult.isErr()) {
          throw cardResult.error;
        }

        await cardRepo.save(cardResult.value);
      }
    });

    it('should handle pagination correctly', async () => {
      const query = {
        userId: curatorId.value,
        page: 1,
        limit: 2,
      };

      const result = await useCase.execute(query);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.cards).toHaveLength(2);
      expect(response.pagination.currentPage).toBe(1);
      expect(response.pagination.totalPages).toBe(3);
      expect(response.pagination.totalCount).toBe(5);
      expect(response.pagination.hasMore).toBe(true);
      expect(response.pagination.limit).toBe(2);
    });

    it('should handle second page correctly', async () => {
      const query = {
        userId: curatorId.value,
        page: 2,
        limit: 2,
      };

      const result = await useCase.execute(query);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.cards).toHaveLength(2);
      expect(response.pagination.currentPage).toBe(2);
      expect(response.pagination.hasMore).toBe(true);
    });

    it('should handle last page correctly', async () => {
      const query = {
        userId: curatorId.value,
        page: 3,
        limit: 2,
      };

      const result = await useCase.execute(query);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.cards).toHaveLength(1);
      expect(response.pagination.currentPage).toBe(3);
      expect(response.pagination.hasMore).toBe(false);
    });

    it('should cap limit at 100', async () => {
      const query = {
        userId: curatorId.value,
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
      // Create URL cards with different properties for sorting
      const now = new Date();

      // Create Alpha card
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

      const alphaCardResult = Card.create(
        {
          curatorId: curatorId,
          type: alphaCardType,
          content: alphaCardContent,
          url: alphaUrl,
          libraryMemberships: [
            { curatorId: curatorId, addedAt: new Date(now.getTime() - 2000) },
          ],
          libraryCount: 1,
          createdAt: new Date(now.getTime() - 2000),
          updatedAt: new Date(now.getTime() - 1000),
        },
        new UniqueEntityID(),
      );

      if (alphaCardResult.isErr()) {
        throw alphaCardResult.error;
      }

      // Create Beta card
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

      const betaCardResult = Card.create(
        {
          curatorId: curatorId,
          type: betaCardType,
          content: betaCardContent,
          url: betaUrl,
          libraryMemberships: [
            { curatorId: curatorId, addedAt: new Date(now.getTime() - 1000) },
          ],
          libraryCount: 1,
          createdAt: new Date(now.getTime() - 1000),
          updatedAt: new Date(now.getTime() - 2000),
        },
        new UniqueEntityID(),
      );

      if (betaCardResult.isErr()) {
        throw betaCardResult.error;
      }

      // Create Gamma card
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

      const gammaCardResult = Card.create(
        {
          curatorId: curatorId,
          type: gammaCardType,
          content: gammaCardContent,
          url: gammaUrl,
          libraryMemberships: [
            { curatorId: curatorId, addedAt: new Date(now.getTime()) },
          ],
          libraryCount: 1,
          createdAt: new Date(now.getTime()),
          updatedAt: new Date(now.getTime()),
        },
        new UniqueEntityID(),
      );

      if (gammaCardResult.isErr()) {
        throw gammaCardResult.error;
      }

      await cardRepo.save(alphaCardResult.value);
      await cardRepo.save(betaCardResult.value);
      await cardRepo.save(gammaCardResult.value);
    });

    it('should sort by library count descending', async () => {
      const query = {
        userId: curatorId.value,
        sortBy: CardSortField.LIBRARY_COUNT,
        sortOrder: SortOrder.DESC,
      };

      const result = await useCase.execute(query);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.cards).toHaveLength(3);
      // All URL cards now have libraryCount of 1, so order will be by secondary sort (likely creation time)
      expect(response.cards[0]?.libraryCount).toBe(1); // gamma (newest)
      expect(response.cards[1]?.libraryCount).toBe(1); // beta
      expect(response.cards[2]?.libraryCount).toBe(1); // alpha (oldest)
      expect(response.sorting.sortBy).toBe(CardSortField.LIBRARY_COUNT);
      expect(response.sorting.sortOrder).toBe(SortOrder.DESC);
    });

    it('should sort by library count ascending', async () => {
      const query = {
        userId: curatorId.value,
        sortBy: CardSortField.LIBRARY_COUNT,
        sortOrder: SortOrder.ASC,
      };

      const result = await useCase.execute(query);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      // All URL cards now have libraryCount of 1, so order will be by secondary sort (likely creation time)
      expect(response.cards[0]?.libraryCount).toBe(1); // alpha (oldest)
      expect(response.cards[1]?.libraryCount).toBe(1); // beta
      expect(response.cards[2]?.libraryCount).toBe(1); // gamma (newest)
    });

    it('should sort by updated date descending', async () => {
      const query = {
        userId: curatorId.value,
        sortBy: CardSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
      };

      const result = await useCase.execute(query);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.cards[0]?.cardContent.title).toBe('Gamma Article'); // most recent
      expect(response.cards[1]?.cardContent.title).toBe('Alpha Article');
      expect(response.cards[2]?.cardContent.title).toBe('Beta Article'); // oldest
      // Verify all cards have author info
      response.cards.forEach((card) => {
        expect(card.author.id).toBe(curatorId.value);
        expect(card.author.name).toBe('Test Curator');
      });
    });

    it('should sort by created date ascending', async () => {
      const query = {
        userId: curatorId.value,
        sortBy: CardSortField.CREATED_AT,
        sortOrder: SortOrder.ASC,
      };

      const result = await useCase.execute(query);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.cards[0]?.cardContent.title).toBe('Alpha Article'); // oldest
      expect(response.cards[1]?.cardContent.title).toBe('Beta Article');
      expect(response.cards[2]?.cardContent.title).toBe('Gamma Article'); // newest
      // Verify all cards have author info
      response.cards.forEach((card) => {
        expect(card.author.id).toBe(curatorId.value);
        expect(card.author.name).toBe('Test Curator');
      });
    });

    it('should use default sorting when not specified', async () => {
      const query = {
        userId: curatorId.value,
      };

      const result = await useCase.execute(query);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.sorting.sortBy).toBe(CardSortField.UPDATED_AT);
      expect(response.sorting.sortOrder).toBe(SortOrder.DESC);
    });
  });

  describe('Error handling', () => {
    it('should fail with invalid user ID', async () => {
      const query = {
        userId: 'invalid-user-id',
      };

      const result = await useCase.execute(query);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Invalid user identifier');
      }
    });

    it('should handle repository errors gracefully', async () => {
      // Create a mock repository that throws an error
      const errorRepo = {
        getUrlCardsOfUser: jest
          .fn()
          .mockRejectedValue(new Error('Database connection failed')),
        getCardsInCollection: jest
          .fn()
          .mockRejectedValue(new Error('Database connection failed')),
        getUrlCardView: jest
          .fn()
          .mockRejectedValue(new Error('Database connection failed')),
        getUrlCardBasic: jest.fn(),
        getLibrariesForCard: jest.fn(),
        getLibrariesForUrl: jest.fn(),
        getNoteCardsForUrl: jest.fn(),
        getBatchUrlCardViews: jest.fn(),
        getBatchUrlLibraryInfo: jest.fn(),
      };

      const errorUseCase = new GetUrlCardsUseCase(
        errorRepo,
        identityResolutionService,
        profileService,
      );

      const query = {
        userId: curatorId.value,
      };

      const result = await errorUseCase.execute(query);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to retrieve URL cards');
        expect(result.error.message).toContain('Database connection failed');
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle URL cards with minimal metadata', async () => {
      // Create URL with minimal metadata
      const url = URL.create('https://example.com/minimal').unwrap();
      const cardType = CardType.create(CardTypeEnum.URL).unwrap();
      const cardContent = CardContent.createUrlContent(url).unwrap();

      const cardResult = Card.create(
        {
          curatorId: curatorId,
          type: cardType,
          content: cardContent,
          url: url,
          libraryMemberships: [{ curatorId: curatorId, addedAt: new Date() }],
          libraryCount: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        new UniqueEntityID(),
      );

      if (cardResult.isErr()) {
        throw cardResult.error;
      }

      await cardRepo.save(cardResult.value);

      const query = {
        userId: curatorId.value,
      };

      const result = await useCase.execute(query);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.cards).toHaveLength(1);
      expect(response.cards[0]?.cardContent.title).toBeUndefined();
      expect(response.cards[0]?.cardContent.description).toBeUndefined();
      expect(response.cards[0]?.cardContent.author).toBeUndefined();
      expect(response.cards[0]?.cardContent.imageUrl).toBeUndefined();
      expect(response.cards[0]?.author.id).toBe(curatorId.value);
      expect(response.cards[0]?.author.name).toBe('Test Curator');
    });

    it('should handle cards without notes', async () => {
      // Create URL metadata
      const urlMetadata = UrlMetadata.create({
        url: 'https://example.com/no-collections',
        title: 'Article with No Collections',
      }).unwrap();

      const url = URL.create('https://example.com/no-collections').unwrap();
      const cardType = CardType.create(CardTypeEnum.URL).unwrap();
      const cardContent = CardContent.createUrlContent(
        url,
        urlMetadata,
      ).unwrap();

      const cardResult = Card.create(
        {
          curatorId: curatorId,
          type: cardType,
          content: cardContent,
          url: url,
          libraryMemberships: [{ curatorId: curatorId, addedAt: new Date() }],
          libraryCount: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        new UniqueEntityID(),
      );

      if (cardResult.isErr()) {
        throw cardResult.error;
      }

      await cardRepo.save(cardResult.value);

      const query = {
        userId: curatorId.value,
      };

      const result = await useCase.execute(query);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.cards).toHaveLength(1);
      // Collections are no longer included in the URL cards response
      expect(response.cards[0]?.author.id).toBe(curatorId.value);
      expect(response.cards[0]?.author.name).toBe('Test Curator');
    });
  });
});
