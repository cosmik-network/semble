import { GetUrlStatusForMyLibraryUseCase } from '../../application/useCases/queries/GetUrlStatusForMyLibraryUseCase';
import { InMemoryCardRepository } from '../utils/InMemoryCardRepository';
import { InMemoryCardQueryRepository } from '../utils/InMemoryCardQueryRepository';
import { InMemoryCollectionRepository } from '../utils/InMemoryCollectionRepository';
import { InMemoryCollectionQueryRepository } from '../utils/InMemoryCollectionQueryRepository';
import { FakeCardPublisher } from '../utils/FakeCardPublisher';
import { FakeCollectionPublisher } from '../utils/FakeCollectionPublisher';
import { FakeEventPublisher } from '../utils/FakeEventPublisher';
import { FakeProfileService } from '../utils/FakeProfileService';
import { CuratorId } from '../../domain/value-objects/CuratorId';
import { CardBuilder } from '../utils/builders/CardBuilder';
import { CollectionBuilder } from '../utils/builders/CollectionBuilder';
import { CardTypeEnum } from '../../domain/value-objects/CardType';
import { PublishedRecordId } from '../../domain/value-objects/PublishedRecordId';
import { URL } from '../../domain/value-objects/URL';
import { err } from 'src/shared/core/Result';
import { ICardRepository } from '../../domain/ICardRepository';
import { InMemoryFollowsRepository } from '../../../user/tests/infrastructure/InMemoryFollowsRepository';

describe('GetUrlStatusForMyLibraryUseCase', () => {
  let useCase: GetUrlStatusForMyLibraryUseCase;
  let cardRepository: InMemoryCardRepository;
  let cardQueryRepository: InMemoryCardQueryRepository;
  let collectionRepository: InMemoryCollectionRepository;
  let collectionQueryRepository: InMemoryCollectionQueryRepository;
  let cardPublisher: FakeCardPublisher;
  let collectionPublisher: FakeCollectionPublisher;
  let eventPublisher: FakeEventPublisher;
  let profileService: FakeProfileService;
  let followsRepository: InMemoryFollowsRepository;
  let curatorId: CuratorId;
  let otherCuratorId: CuratorId;

  beforeEach(() => {
    cardRepository = InMemoryCardRepository.getInstance();
    collectionRepository = InMemoryCollectionRepository.getInstance();
    cardQueryRepository = new InMemoryCardQueryRepository(
      cardRepository,
      collectionRepository,
    );
    collectionQueryRepository = new InMemoryCollectionQueryRepository(
      collectionRepository,
    );
    cardPublisher = new FakeCardPublisher();
    collectionPublisher = new FakeCollectionPublisher();
    eventPublisher = new FakeEventPublisher();
    profileService = new FakeProfileService();
    followsRepository = InMemoryFollowsRepository.getInstance();

    useCase = new GetUrlStatusForMyLibraryUseCase(
      cardRepository,
      cardQueryRepository,
      collectionQueryRepository,
      collectionRepository,
      profileService,
      followsRepository,
      eventPublisher,
    );

    curatorId = CuratorId.create('did:plc:testcurator').unwrap();
    otherCuratorId = CuratorId.create('did:plc:othercurator').unwrap();

    // Set up profiles
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
    cardRepository.clear();
    cardQueryRepository.clear();
    collectionRepository.clear();
    collectionQueryRepository.clear();
    cardPublisher.clear();
    collectionPublisher.clear();
    eventPublisher.clear();
    profileService.clear();
  });

  describe('URL card in collections', () => {
    it('should return card ID and collections when user has URL card in multiple collections', async () => {
      const testUrl = 'https://example.com/test-article';

      // Create a URL card
      const url = URL.create(testUrl).unwrap();
      const card = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withType(CardTypeEnum.URL)
        .withUrl(url)
        .build();

      if (card instanceof Error) {
        throw new Error(`Failed to create card: ${card.message}`);
      }

      // Add card to library
      const addToLibResult = card.addToLibrary(curatorId);
      if (addToLibResult.isErr()) {
        throw new Error(
          `Failed to add card to library: ${addToLibResult.error.message}`,
        );
      }

      await cardRepository.save(card);

      // Publish the card to simulate it being published
      cardPublisher.publishCardToLibrary(card, curatorId);

      // Create first collection
      const collection1 = new CollectionBuilder()
        .withAuthorId(curatorId.value)
        .withName('Tech Articles')
        .withDescription('Collection of technology articles')
        .build();

      if (collection1 instanceof Error) {
        throw new Error(`Failed to create collection1: ${collection1.message}`);
      }

      // Create second collection
      const collection2 = new CollectionBuilder()
        .withAuthorId(curatorId.value)
        .withName('Reading List')
        .withDescription('My personal reading list')
        .build();

      if (collection2 instanceof Error) {
        throw new Error(`Failed to create collection2: ${collection2.message}`);
      }

      // Add card to both collections
      const addToCollection1Result = collection1.addCard(
        card.cardId,
        curatorId,
      );
      if (addToCollection1Result.isErr()) {
        throw new Error(
          `Failed to add card to collection1: ${addToCollection1Result.error.message}`,
        );
      }

      const addToCollection2Result = collection2.addCard(
        card.cardId,
        curatorId,
      );
      if (addToCollection2Result.isErr()) {
        throw new Error(
          `Failed to add card to collection2: ${addToCollection2Result.error.message}`,
        );
      }

      // Mark collections as published
      const collection1PublishedRecordId = PublishedRecordId.create({
        uri: 'at://did:plc:testcurator/network.cosmik.collection/collection1',
        cid: 'bafyreicollection1cid',
      });

      const collection2PublishedRecordId = PublishedRecordId.create({
        uri: 'at://did:plc:testcurator/network.cosmik.collection/collection2',
        cid: 'bafyreicollection2cid',
      });

      collection1.markAsPublished(collection1PublishedRecordId);
      collection2.markAsPublished(collection2PublishedRecordId);

      // Mark card links as published in collections
      const cardLinkPublishedRecordId1 = PublishedRecordId.create({
        uri: 'at://did:plc:testcurator/network.cosmik.collection/collection1/link1',
        cid: 'bafyreilink1cid',
      });

      const cardLinkPublishedRecordId2 = PublishedRecordId.create({
        uri: 'at://did:plc:testcurator/network.cosmik.collection/collection2/link2',
        cid: 'bafyreilink2cid',
      });

      collection1.markCardLinkAsPublished(
        card.cardId,
        cardLinkPublishedRecordId1,
      );
      collection2.markCardLinkAsPublished(
        card.cardId,
        cardLinkPublishedRecordId2,
      );

      // Save collections
      await collectionRepository.save(collection1);
      await collectionRepository.save(collection2);

      // Publish collections and links
      collectionPublisher.publish(collection1);
      collectionPublisher.publish(collection2);
      collectionPublisher.publishCardAddedToCollection(
        card,
        collection1,
        curatorId,
      );
      collectionPublisher.publishCardAddedToCollection(
        card,
        collection2,
        curatorId,
      );

      // Execute the use case
      const query = {
        url: testUrl,
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(query);

      // Verify the result
      expect(result.isOk()).toBe(true);
      const response = result.unwrap();

      expect(response.card).toBeDefined();
      expect(response.card?.id).toBe(card.cardId.getStringValue());
      expect(response.collections).toHaveLength(2);

      // Verify collection details
      const techArticlesCollection = response.collections?.find(
        (c) => c.name === 'Tech Articles',
      );
      const readingListCollection = response.collections?.find(
        (c) => c.name === 'Reading List',
      );

      expect(techArticlesCollection).toBeDefined();
      expect(techArticlesCollection?.id).toBe(
        collection1.collectionId.getStringValue(),
      );
      expect(techArticlesCollection?.uri).toBe(
        'at://did:plc:testcurator/network.cosmik.collection/collection1',
      );
      expect(techArticlesCollection?.name).toBe('Tech Articles');
      expect(techArticlesCollection?.description).toBe(
        'Collection of technology articles',
      );

      expect(readingListCollection).toBeDefined();
      expect(readingListCollection?.id).toBe(
        collection2.collectionId.getStringValue(),
      );
      expect(readingListCollection?.uri).toBe(
        'at://did:plc:testcurator/network.cosmik.collection/collection2',
      );
      expect(readingListCollection?.name).toBe('Reading List');
      expect(readingListCollection?.description).toBe(
        'My personal reading list',
      );
    });

    it('should return card ID and empty collections when user has URL card but not in any collections', async () => {
      const testUrl = 'https://example.com/standalone-article';

      // Create a URL card
      const url = URL.create(testUrl).unwrap();
      const card = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withType(CardTypeEnum.URL)
        .withUrl(url)
        .build();

      if (card instanceof Error) {
        throw new Error(`Failed to create card: ${card.message}`);
      }

      // Add card to library
      const addToLibResult = card.addToLibrary(curatorId);
      if (addToLibResult.isErr()) {
        throw new Error(
          `Failed to add card to library: ${addToLibResult.error.message}`,
        );
      }

      await cardRepository.save(card);

      // Publish the card
      cardPublisher.publishCardToLibrary(card, curatorId);

      // Execute the use case
      const query = {
        url: testUrl,
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(query);

      // Verify the result
      expect(result.isOk()).toBe(true);
      const response = result.unwrap();

      expect(response.card).toBeDefined();
      expect(response.card?.id).toBe(card.cardId.getStringValue());
      expect(response.collections).toHaveLength(0);
    });

    it('should return empty result when user does not have URL card for the URL', async () => {
      const testUrl = 'https://example.com/nonexistent-article';

      // Execute the use case without creating any cards
      const query = {
        url: testUrl,
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(query);

      // Verify the result
      expect(result.isOk()).toBe(true);
      const response = result.unwrap();

      expect(response.card).toBeUndefined();
      expect(response.collections).toBeUndefined();
    });

    it('should not return collections from other users even if they have the same URL', async () => {
      const testUrl = 'https://example.com/shared-article';

      // Create URL card for first user
      const url = URL.create(testUrl).unwrap();
      const card1 = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withType(CardTypeEnum.URL)
        .withUrl(url)
        .build();

      if (card1 instanceof Error) {
        throw new Error(`Failed to create card1: ${card1.message}`);
      }

      const addToLibResult1 = card1.addToLibrary(curatorId);
      if (addToLibResult1.isErr()) {
        throw new Error(
          `Failed to add card1 to library: ${addToLibResult1.error.message}`,
        );
      }

      await cardRepository.save(card1);

      // Create URL card for second user (different card, same URL)
      const card2 = new CardBuilder()
        .withCuratorId(otherCuratorId.value)
        .withType(CardTypeEnum.URL)
        .withUrl(url)
        .build();

      if (card2 instanceof Error) {
        throw new Error(`Failed to create card2: ${card2.message}`);
      }

      const addToLibResult2 = card2.addToLibrary(otherCuratorId);
      if (addToLibResult2.isErr()) {
        throw new Error(
          `Failed to add card2 to library: ${addToLibResult2.error.message}`,
        );
      }

      await cardRepository.save(card2);

      // Create collection for second user and add their card
      const otherUserCollection = new CollectionBuilder()
        .withAuthorId(otherCuratorId.value)
        .withName('Other User Collection')
        .build();

      if (otherUserCollection instanceof Error) {
        throw new Error(
          `Failed to create other user collection: ${otherUserCollection.message}`,
        );
      }

      const addToOtherCollectionResult = otherUserCollection.addCard(
        card2.cardId,
        otherCuratorId,
      );
      if (addToOtherCollectionResult.isErr()) {
        throw new Error(
          `Failed to add card2 to other collection: ${addToOtherCollectionResult.error.message}`,
        );
      }

      await collectionRepository.save(otherUserCollection);

      // Execute the use case for first user
      const query = {
        url: testUrl,
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(query);

      // Verify the result - should only see first user's card, no collections
      expect(result.isOk()).toBe(true);
      const response = result.unwrap();

      expect(response.card).toBeDefined();
      expect(response.card?.id).toBe(card1.cardId.getStringValue());
      expect(response.collections).toHaveLength(0); // No collections for first user
    });

    it('should only return collections owned by the requesting user', async () => {
      const testUrl = 'https://example.com/multi-user-article';

      // Create URL card for the user
      const url = URL.create(testUrl).unwrap();
      const card = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withType(CardTypeEnum.URL)
        .withUrl(url)
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

      // Create user's own collection
      const userCollection = new CollectionBuilder()
        .withAuthorId(curatorId.value)
        .withName('My Collection')
        .build();

      if (userCollection instanceof Error) {
        throw new Error(
          `Failed to create user collection: ${userCollection.message}`,
        );
      }

      const addToUserCollectionResult = userCollection.addCard(
        card.cardId,
        curatorId,
      );
      if (addToUserCollectionResult.isErr()) {
        throw new Error(
          `Failed to add card to user collection: ${addToUserCollectionResult.error.message}`,
        );
      }

      await collectionRepository.save(userCollection);

      // Create another user's collection (this should not appear in results)
      const otherUserCollection = new CollectionBuilder()
        .withAuthorId(otherCuratorId.value)
        .withName('Other User Collection')
        .build();

      if (otherUserCollection instanceof Error) {
        throw new Error(
          `Failed to create other user collection: ${otherUserCollection.message}`,
        );
      }

      // Note: We don't add the card to the other user's collection since they can't add
      // another user's card to their collection in this domain model

      await collectionRepository.save(otherUserCollection);

      // Execute the use case
      const query = {
        url: testUrl,
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(query);

      // Verify the result - should only see user's own collection
      expect(result.isOk()).toBe(true);
      const response = result.unwrap();

      expect(response.card).toBeDefined();
      expect(response.card?.id).toBe(card.cardId.getStringValue());
      expect(response.collections).toHaveLength(1);
      expect(response.collections?.[0]?.name).toBe('My Collection');
      expect(response.collections?.[0]?.id).toBe(
        userCollection.collectionId.getStringValue(),
      );
    });
  });

  describe('Validation', () => {
    it('should fail with invalid URL', async () => {
      const query = {
        url: 'not-a-valid-url',
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(query);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Invalid URL');
      }
    });

    it('should fail with invalid curator ID', async () => {
      const query = {
        url: 'https://example.com/valid-url',
        curatorId: 'invalid-curator-id',
      };

      const result = await useCase.execute(query);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Invalid curator ID');
      }
    });
  });

  describe('Error handling', () => {
    it('should handle repository errors gracefully', async () => {
      // Create a mock repository that returns an error Result
      const errorCardRepository: ICardRepository = {
        findUsersUrlCardByUrl: jest
          .fn()
          .mockResolvedValue(err(new Error('Database error'))),
        save: jest.fn(),
        findById: jest.fn(),
        delete: jest.fn(),
        findUsersNoteCardByUrl: jest.fn(),
      };

      const errorUseCase = new GetUrlStatusForMyLibraryUseCase(
        errorCardRepository,
        cardQueryRepository,
        collectionQueryRepository,
        collectionRepository,
        profileService,
        followsRepository,
        eventPublisher,
      );

      const query = {
        url: 'https://example.com/test-url',
        curatorId: curatorId.value,
      };

      const result = await errorUseCase.execute(query);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Database error');
      }
    });

    it('should handle collection query repository errors gracefully', async () => {
      const testUrl = 'https://example.com/error-test';

      // Create a URL card
      const url = URL.create(testUrl).unwrap();
      const card = new CardBuilder()
        .withCuratorId(curatorId.value)
        .withType(CardTypeEnum.URL)
        .withUrl(url)
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

      // Create a mock collection query repository that throws an error
      const errorCollectionQueryRepository = {
        findByCreator: jest.fn(),
        getCollectionsContainingCardForUser: jest
          .fn()
          .mockRejectedValue(new Error('Collection query error')),
        getCollectionsWithUrl: jest.fn(),
        searchCollections: jest.fn(),
        getOpenCollectionsWithContributor: jest.fn(),
      };

      const errorUseCase = new GetUrlStatusForMyLibraryUseCase(
        cardRepository,
        cardQueryRepository,
        errorCollectionQueryRepository,
        collectionRepository,
        profileService,
        followsRepository,
        eventPublisher,
      );

      const query = {
        url: testUrl,
        curatorId: curatorId.value,
      };

      const result = await errorUseCase.execute(query);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Collection query error');
      }
    });
  });
});
