import { GetUrlCardViewUseCase } from '../../application/useCases/queries/GetUrlCardViewUseCase';
import { InMemoryCardQueryRepository } from '../utils/InMemoryCardQueryRepository';
import { InMemoryCardRepository } from '../utils/InMemoryCardRepository';
import { InMemoryCollectionRepository } from '../utils/InMemoryCollectionRepository';
import { FakeProfileService } from '../utils/FakeProfileService';
import { CuratorId } from '../../domain/value-objects/CuratorId';
import { Card } from '../../domain/Card';
import { CardType, CardTypeEnum } from '../../domain/value-objects/CardType';
import { CardContent } from '../../domain/value-objects/CardContent';
import { UrlMetadata } from '../../domain/value-objects/UrlMetadata';
import { URL } from '../../domain/value-objects/URL';
import { UniqueEntityID } from '../../../../shared/domain/UniqueEntityID';
import { Collection, CollectionAccessType } from '../../domain/Collection';

describe('GetUrlCardViewUseCase', () => {
  let useCase: GetUrlCardViewUseCase;
  let cardQueryRepo: InMemoryCardQueryRepository;
  let cardRepo: InMemoryCardRepository;
  let collectionRepo: InMemoryCollectionRepository;
  let profileService: FakeProfileService;
  let curatorId: CuratorId;
  let otherCuratorId: CuratorId;
  let cardId: string;

  beforeEach(() => {
    cardRepo = InMemoryCardRepository.getInstance();
    collectionRepo = InMemoryCollectionRepository.getInstance();
    cardQueryRepo = new InMemoryCardQueryRepository(cardRepo, collectionRepo);
    profileService = new FakeProfileService();
    useCase = new GetUrlCardViewUseCase(
      cardQueryRepo,
      profileService,
      collectionRepo,
    );

    curatorId = CuratorId.create('did:plc:testcurator').unwrap();
    otherCuratorId = CuratorId.create('did:plc:othercurator').unwrap();
    cardId = new UniqueEntityID().toString();

    // Set up profiles for the curators
    profileService.addProfile({
      id: curatorId.value,
      name: 'Test Curator',
      handle: 'testcurator',
      avatarUrl: 'https://example.com/avatar1.jpg',
      bio: 'Test curator bio',
    });

    profileService.addProfile({
      id: otherCuratorId.value,
      name: 'Other Curator',
      handle: 'othercurator',
      avatarUrl: 'https://example.com/avatar2.jpg',
      bio: 'Other curator bio',
    });
  });

  afterEach(() => {
    cardRepo.clear();
    collectionRepo.clear();
    cardQueryRepo.clear();
    profileService.clear();
  });

  describe('Basic functionality', () => {
    it('should return URL card view with enriched library data', async () => {
      // Create URL metadata
      const urlMetadata = UrlMetadata.create({
        url: 'https://example.com/article1',
        title: 'Test Article',
        description: 'Description of test article',
        author: 'John Doe',
        imageUrl: 'https://example.com/thumb1.jpg',
      }).unwrap();

      // Create URL and card content
      const url = URL.create('https://example.com/article1').unwrap();
      const cardType = CardType.create(CardTypeEnum.URL).unwrap();
      const cardContent = CardContent.createUrlContent(
        url,
        urlMetadata,
      ).unwrap();

      // Create card with library memberships
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
        new UniqueEntityID(cardId),
      );

      if (cardResult.isErr()) {
        throw cardResult.error;
      }

      const card = cardResult.value;
      await cardRepo.save(card);

      // now create a note card that references this URL card
      const noteCardResult = Card.create({
        curatorId: curatorId,
        type: CardType.create(CardTypeEnum.NOTE).unwrap(),
        content: CardContent.createNoteContent(
          'This is my note about the article',
        ).unwrap(),
        parentCardId: card.cardId,
        url: url,
      });

      const noteCard = noteCardResult.unwrap();
      await cardRepo.save(noteCard);

      const collectionResult = Collection.create({
        name: 'Reading List',
        authorId: curatorId,
        accessType: CollectionAccessType.CLOSED,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01'),
        collaboratorIds: [],
      });
      if (collectionResult.isErr()) {
        throw collectionResult.error;
      }
      const collection = collectionResult.value;
      collection.addCard(card.cardId, curatorId);
      await collectionRepo.save(collection);

      const query = {
        cardId: cardId,
      };

      const result = await useCase.execute(query);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();

      // Verify basic card data
      expect(response.id).toBe(cardId);
      expect(response.type).toBe(CardTypeEnum.URL);
      expect(response.url).toBe('https://example.com/article1');
      expect(response.cardContent.title).toBe('Test Article');
      expect(response.cardContent.description).toBe(
        'Description of test article',
      );
      expect(response.cardContent.author).toBe('John Doe');
      expect(response.cardContent.imageUrl).toBe(
        'https://example.com/thumb1.jpg',
      );
      expect(response.libraryCount).toBe(1);

      // Verify collections
      expect(response.collections).toHaveLength(1);
      expect(response.collections[0]?.name).toBe('Reading List');
      expect(response.collections[0]?.author.id).toBe(curatorId.value);

      // Verify note
      expect(response.note).toBeDefined();
      expect(response.note?.text).toBe('This is my note about the article');

      // Verify enriched library data
      expect(response.libraries).toHaveLength(1);

      const testCuratorLib = response.libraries.find(
        (lib) => lib.id === curatorId.value,
      );
      expect(testCuratorLib).toBeDefined();
      expect(testCuratorLib?.name).toBe('Test Curator');
      expect(testCuratorLib?.handle).toBe('testcurator');
      expect(testCuratorLib?.avatarUrl).toBe('https://example.com/avatar1.jpg');
    });

    it('should return URL card view with no libraries', async () => {
      // Create URL metadata
      const urlMetadata = UrlMetadata.create({
        url: 'https://example.com/lonely-article',
        title: 'Lonely Article',
        description: 'An article with no libraries',
      }).unwrap();

      // Create URL and card content
      const url = URL.create('https://example.com/lonely-article').unwrap();
      const cardType = CardType.create(CardTypeEnum.URL).unwrap();
      const cardContent = CardContent.createUrlContent(
        url,
        urlMetadata,
      ).unwrap();

      // Create card with no library memberships
      const cardResult = Card.create(
        {
          curatorId: curatorId,
          type: cardType,
          content: cardContent,
          url: url,
          libraryMemberships: [],
          libraryCount: 0,
          createdAt: new Date('2023-01-01'),
          updatedAt: new Date('2023-01-01'),
        },
        new UniqueEntityID(cardId),
      );

      if (cardResult.isErr()) {
        throw cardResult.error;
      }

      const card = cardResult.value;
      await cardRepo.save(card);

      const query = {
        cardId: cardId,
      };

      const result = await useCase.execute(query);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.libraries).toHaveLength(0);
      expect(response.collections).toHaveLength(0);
      expect(response.note).toBeUndefined();
    });

    it('should return URL card view with minimal metadata', async () => {
      // Create URL with minimal metadata
      const url = URL.create('https://example.com/minimal').unwrap();
      const cardType = CardType.create(CardTypeEnum.URL).unwrap();
      const cardContent = CardContent.createUrlContent(url).unwrap();

      // Create card with minimal data
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
        new UniqueEntityID(cardId),
      );

      if (cardResult.isErr()) {
        throw cardResult.error;
      }

      const card = cardResult.value;
      await cardRepo.save(card);

      const query = {
        cardId: cardId,
      };

      const result = await useCase.execute(query);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.cardContent.title).toBeUndefined();
      expect(response.cardContent.description).toBeUndefined();
      expect(response.cardContent.author).toBeUndefined();
      expect(response.cardContent.imageUrl).toBeUndefined();
      expect(response.libraries).toHaveLength(1);
    });

    it('should handle profiles with minimal data', async () => {
      // Add a curator with minimal profile data
      const minimalCuratorId = CuratorId.create('did:plc:minimal').unwrap();
      profileService.addProfile({
        id: minimalCuratorId.value,
        name: 'Minimal User',
        handle: 'minimal',
        // No avatarUrl or bio
      });

      // Create URL metadata
      const urlMetadata = UrlMetadata.create({
        url: 'https://example.com/test',
        title: 'Test Article',
      }).unwrap();

      // Create URL and card content
      const url = URL.create('https://example.com/test').unwrap();
      const cardType = CardType.create(CardTypeEnum.URL).unwrap();
      const cardContent = CardContent.createUrlContent(
        url,
        urlMetadata,
      ).unwrap();

      // Create card
      const cardResult = Card.create(
        {
          curatorId: minimalCuratorId,
          type: cardType,
          content: cardContent,
          url: url,
          libraryMemberships: [
            { curatorId: minimalCuratorId, addedAt: new Date() },
          ],
          libraryCount: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        new UniqueEntityID(cardId),
      );

      if (cardResult.isErr()) {
        throw cardResult.error;
      }

      const card = cardResult.value;
      await cardRepo.save(card);

      const query = {
        cardId: cardId,
      };

      const result = await useCase.execute(query);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.libraries).toHaveLength(1);
      expect(response.libraries[0]?.name).toBe('Minimal User');
      expect(response.libraries[0]?.handle).toBe('minimal');
      expect(response.libraries[0]?.avatarUrl).toBeUndefined();
    });
  });

  describe('Error handling', () => {
    it('should fail with invalid card ID', async () => {
      const query = {
        cardId: 'invalid-card-id',
      };

      const result = await useCase.execute(query);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('URL card not found');
      }
    });

    it('should fail when card not found', async () => {
      const nonExistentCardId = new UniqueEntityID().toString();

      const query = {
        cardId: nonExistentCardId,
      };

      const result = await useCase.execute(query);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('URL card not found');
      }
    });

    it('should fail when profile service fails', async () => {
      // Create URL metadata
      const urlMetadata = UrlMetadata.create({
        url: 'https://example.com/test',
        title: 'Test Article',
      }).unwrap();

      // Create URL and card content
      const url = URL.create('https://example.com/test').unwrap();
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
          libraryMemberships: [{ curatorId: curatorId, addedAt: new Date() }],
          libraryCount: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        new UniqueEntityID(cardId),
      );

      if (cardResult.isErr()) {
        throw cardResult.error;
      }

      const card = cardResult.value;
      await cardRepo.save(card);

      // Make profile service fail
      profileService.setShouldFail(true);

      const query = {
        cardId: cardId,
      };

      const result = await useCase.execute(query);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to fetch card author');
      }
    });

    it('should fail when user profile not found', async () => {
      const unknownUserId = 'did:plc:unknown';
      const unknownCuratorId = CuratorId.create(unknownUserId).unwrap();

      // Create URL metadata
      const urlMetadata = UrlMetadata.create({
        url: 'https://example.com/test',
        title: 'Test Article',
      }).unwrap();

      // Create URL and card content
      const url = URL.create('https://example.com/test').unwrap();
      const cardType = CardType.create(CardTypeEnum.URL).unwrap();
      const cardContent = CardContent.createUrlContent(
        url,
        urlMetadata,
      ).unwrap();

      // Create card with unknown user in library
      const cardResult = Card.create(
        {
          curatorId: unknownCuratorId,
          type: cardType,
          content: cardContent,
          url: url,
          libraryMemberships: [
            { curatorId: unknownCuratorId, addedAt: new Date() },
          ],
          libraryCount: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        new UniqueEntityID(cardId),
      );

      if (cardResult.isErr()) {
        throw cardResult.error;
      }

      const card = cardResult.value;
      await cardRepo.save(card);

      const query = {
        cardId: cardId,
      };

      const result = await useCase.execute(query);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to fetch card author');
      }
    });

    it('should handle repository errors gracefully', async () => {
      // Create a mock repository that throws an error
      const errorRepo = {
        getUrlCardsOfUser: jest.fn(),
        getCardsInCollection: jest.fn(),
        getUrlCardView: jest
          .fn()
          .mockRejectedValue(new Error('Database connection failed')),
        getUrlCardBasic: jest.fn(),
        getLibrariesForCard: jest.fn(),
        getLibrariesForUrl: jest.fn(),
        getNoteCardsForUrl: jest.fn(),
        getBatchUrlCardViews: jest.fn(),
      };

      const errorUseCase = new GetUrlCardViewUseCase(
        errorRepo,
        profileService,
        collectionRepo,
      );

      const query = {
        cardId: cardId,
      };

      const result = await errorUseCase.execute(query);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain(
          'Failed to retrieve URL card view',
        );
        expect(result.error.message).toContain('Database connection failed');
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle card with many libraries', async () => {
      // Create multiple users
      const userIds: string[] = [];
      const curatorIds: CuratorId[] = [];
      for (let i = 1; i <= 5; i++) {
        const userId = `did:plc:user${i}`;
        const curatorId = CuratorId.create(userId).unwrap();
        userIds.push(userId);
        curatorIds.push(curatorId);
        profileService.addProfile({
          id: userId,
          name: `User ${i}`,
          handle: `user${i}`,
          avatarUrl: `https://example.com/avatar${i}.jpg`,
        });
      }

      // Create URL metadata
      const urlMetadata = UrlMetadata.create({
        url: 'https://example.com/popular-article',
        title: 'Very Popular Article',
      }).unwrap();

      // Create URL and card content
      const url = URL.create('https://example.com/popular-article').unwrap();
      const cardType = CardType.create(CardTypeEnum.URL).unwrap();
      const cardContent = CardContent.createUrlContent(
        url,
        urlMetadata,
      ).unwrap();

      // Create card with single library membership (URL cards can only be in creator's library)
      const cardResult = Card.create(
        {
          curatorId: curatorIds[0]!,
          type: cardType,
          content: cardContent,
          url: url,
          libraryMemberships: [
            {
              curatorId: curatorIds[0]!,
              addedAt: new Date(),
            },
          ],
          libraryCount: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        new UniqueEntityID(cardId),
      );

      if (cardResult.isErr()) {
        throw cardResult.error;
      }

      const card = cardResult.value;
      await cardRepo.save(card);

      const query = {
        cardId: cardId,
      };

      const result = await useCase.execute(query);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.libraries).toHaveLength(1);

      // Verify the creator is included with correct profile data
      const creatorLib = response.libraries.find(
        (lib) => lib.id === userIds[0],
      );
      expect(creatorLib).toBeDefined();
      expect(creatorLib?.name).toBe('User 1');
      expect(creatorLib?.handle).toBe('user1');
      expect(creatorLib?.avatarUrl).toBe('https://example.com/avatar1.jpg');
    });

    it('should handle card with many collections', async () => {
      // Create URL metadata
      const urlMetadata = UrlMetadata.create({
        url: 'https://example.com/well-organized',
        title: 'Well Organized Article',
      }).unwrap();

      // Create URL and card content
      const url = URL.create('https://example.com/well-organized').unwrap();
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
          libraryMemberships: [{ curatorId: curatorId, addedAt: new Date() }],
          libraryCount: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        new UniqueEntityID(cardId),
      );

      if (cardResult.isErr()) {
        throw cardResult.error;
      }

      const card = cardResult.value;
      await cardRepo.save(card);

      // Create multiple collections and add the card to them
      const collectionNames = ['Reading List', 'Favorites', 'Tech Articles'];

      for (const collectionName of collectionNames) {
        const collectionResult = Collection.create({
          name: collectionName,
          authorId: curatorId,
          accessType: CollectionAccessType.CLOSED,
          createdAt: new Date(),
          updatedAt: new Date(),
          collaboratorIds: [],
        });

        if (collectionResult.isErr()) {
          throw collectionResult.error;
        }

        const collection = collectionResult.value;
        collection.addCard(card.cardId, curatorId);
        await collectionRepo.save(collection);
      }

      const query = {
        cardId: cardId,
      };

      const result = await useCase.execute(query);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.collections).toHaveLength(3);

      const collectionNamesInResponse = response.collections
        .map((c) => c.name)
        .sort();
      expect(collectionNamesInResponse).toEqual([
        'Favorites',
        'Reading List',
        'Tech Articles',
      ]);

      // Verify all collections have the correct author
      response.collections.forEach((collection) => {
        expect(collection.author.id).toBe(curatorId.value);
      });
    });

    it('should handle empty card ID', async () => {
      const query = {
        cardId: '',
      };

      const result = await useCase.execute(query);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('URL card not found');
      }
    });
  });
});
