import { ProcessCollectionLinkFirehoseEventUseCase } from '../../application/useCases/ProcessCollectionLinkFirehoseEventUseCase';
import { InMemoryAtUriResolutionService } from '../../../cards/tests/utils/InMemoryAtUriResolutionService';
import { UpdateUrlCardAssociationsUseCase } from '../../../cards/application/useCases/commands/UpdateUrlCardAssociationsUseCase';
import { InMemoryCardRepository } from '../../../cards/tests/utils/InMemoryCardRepository';
import { InMemoryCollectionRepository } from '../../../cards/tests/utils/InMemoryCollectionRepository';
import { FakeCardPublisher } from '../../../cards/tests/utils/FakeCardPublisher';
import { FakeCollectionPublisher } from '../../../cards/tests/utils/FakeCollectionPublisher';
import { FakeEventPublisher } from '../../../cards/tests/utils/FakeEventPublisher';
import { CardLibraryService } from '../../../cards/domain/services/CardLibraryService';
import { CardCollectionService } from '../../../cards/domain/services/CardCollectionService';
import { CardBuilder } from '../../../cards/tests/utils/builders/CardBuilder';
import { CollectionBuilder } from '../../../cards/tests/utils/builders/CollectionBuilder';
import { CuratorId } from '../../../cards/domain/value-objects/CuratorId';
import { CardTypeEnum } from '../../../cards/domain/value-objects/CardType';
import { URL } from '../../../cards/domain/value-objects/URL';
import { Record as CollectionLinkRecord } from '../../infrastructure/lexicon/types/network/cosmik/collectionLink';
import { EnvironmentConfigService } from '../../../../shared/infrastructure/config/EnvironmentConfigService';
import { PublishedRecordId } from '../../../cards/domain/value-objects/PublishedRecordId';

describe('ProcessCollectionLinkFirehoseEventUseCase', () => {
  let useCase: ProcessCollectionLinkFirehoseEventUseCase;
  let atUriResolutionService: InMemoryAtUriResolutionService;
  let updateUrlCardAssociationsUseCase: UpdateUrlCardAssociationsUseCase;
  let cardRepository: InMemoryCardRepository;
  let collectionRepository: InMemoryCollectionRepository;
  let cardPublisher: FakeCardPublisher;
  let collectionPublisher: FakeCollectionPublisher;
  let eventPublisher: FakeEventPublisher;
  let cardLibraryService: CardLibraryService;
  let cardCollectionService: CardCollectionService;
  let curatorId: CuratorId;
  let configService: EnvironmentConfigService;

  beforeEach(() => {
    configService = new EnvironmentConfigService();
    cardRepository = InMemoryCardRepository.getInstance();
    collectionRepository = InMemoryCollectionRepository.getInstance();
    cardPublisher = new FakeCardPublisher();
    collectionPublisher = new FakeCollectionPublisher();
    eventPublisher = new FakeEventPublisher();

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

    atUriResolutionService = new InMemoryAtUriResolutionService(
      collectionRepository,
      cardRepository,
    );

    updateUrlCardAssociationsUseCase = new UpdateUrlCardAssociationsUseCase(
      cardRepository,
      cardLibraryService,
      cardCollectionService,
      eventPublisher,
    );

    useCase = new ProcessCollectionLinkFirehoseEventUseCase(
      atUriResolutionService,
      updateUrlCardAssociationsUseCase,
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

  describe('Collection Link Creation Events', () => {
    it('should process collection link create event successfully', async () => {
      // Create a URL card
      const urlCard = new CardBuilder()
        .withType(CardTypeEnum.URL)
        .withCuratorId(curatorId.value)
        .withUrl(URL.create('https://example.com/article').unwrap())
        .build();

      if (urlCard instanceof Error) throw urlCard;
      await cardRepository.save(urlCard);
      await cardLibraryService.addCardToLibrary(urlCard, curatorId);

      // Create a collection
      const collection = new CollectionBuilder()
        .withAuthorId(curatorId.value)
        .withName('Test Collection')
        .withPublished(true)
        .build();

      if (collection instanceof Error) throw collection;
      await collectionRepository.save(collection);

      const collections = configService.getAtProtoCollections();

      // Create AT URIs that match the pattern used by FakeCollectionPublisher
      const collectionAtUri = `at://${curatorId.value}/${collections.collection}/${collection.collectionId.getStringValue()}`;
      const cardAtUri = `at://${curatorId.value}/${collections.card}/${urlCard.cardId.getStringValue()}`;
      const linkAtUri = `at://${curatorId.value}/${collections.collectionLink}/test-link-id`;
      const cid = 'link-cid-123';

      // Set up published record IDs so the resolution service can find them
      const collectionPublishedRecordId = PublishedRecordId.create({
        uri: collectionAtUri,
        cid: 'collection-cid',
      });
      collection.markAsPublished(collectionPublishedRecordId);
      await collectionRepository.save(collection);

      const cardPublishedRecordId = PublishedRecordId.create({
        uri: cardAtUri,
        cid: 'card-cid',
      });
      urlCard.markAsPublished(cardPublishedRecordId);
      await cardRepository.save(urlCard);

      const linkRecord: CollectionLinkRecord = {
        $type: collections.collectionLink as any,
        collection: {
          uri: collectionAtUri,
          cid: 'collection-cid',
        },
        card: {
          uri: cardAtUri,
          cid: 'card-cid',
        },
        addedBy: curatorId.value,
        addedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      const request = {
        atUri: linkAtUri,
        cid,
        eventType: 'create' as const,
        record: linkRecord,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);

      // Verify card was added to collection
      const updatedCollection = await collectionRepository.findById(
        collection.collectionId,
      );
      expect(updatedCollection.isOk()).toBe(true);
      const collectionFromRepo = updatedCollection.unwrap()!;
      expect(
        collectionFromRepo.cardIds.some((id) => id.equals(urlCard.cardId)),
      ).toBe(true);

      // Verify no additional publishing occurred (firehose event should skip publishing)
      const publishedLinks = collectionPublisher.getAllPublishedLinks();
      expect(publishedLinks).toHaveLength(0);
    });

    it('should handle collection link create with missing collection gracefully', async () => {
      // Create a URL card but no collection
      const urlCard = new CardBuilder()
        .withType(CardTypeEnum.URL)
        .withCuratorId(curatorId.value)
        .build();

      if (urlCard instanceof Error) throw urlCard;
      await cardRepository.save(urlCard);

      const collections = configService.getAtProtoCollections();
      const linkRecord: CollectionLinkRecord = {
        $type: 'network.cosmik.collectionLink',
        collection: {
          uri: `at://${curatorId.value}/${collections.collection}/nonexistent-collection`,
          cid: 'collection-cid',
        },
        card: {
          uri: `at://${curatorId.value}/${collections.card}/test-card-id`,
          cid: 'card-cid',
        },
        addedBy: curatorId.value,
        addedAt: new Date().toISOString(),
      };

      const request = {
        atUri: `at://${curatorId.value}/${collections.collectionLink}/test-link-id`,
        cid: 'link-cid',
        eventType: 'create' as const,
        record: linkRecord,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true); // Should not fail firehose processing
      expect(collectionRepository.getAllCollections()).toHaveLength(0);
    });

    it('should handle collection link create with missing card gracefully', async () => {
      // Create a collection but no card
      const collection = new CollectionBuilder()
        .withAuthorId(curatorId.value)
        .withName('Test Collection')
        .build();

      if (collection instanceof Error) throw collection;
      await collectionRepository.save(collection);

      const collections = configService.getAtProtoCollections();
      const linkRecord: CollectionLinkRecord = {
        $type: 'network.cosmik.collectionLink',
        collection: {
          uri: `at://${curatorId.value}/${collections.collection}/test-collection-id`,
          cid: 'collection-cid',
        },
        card: {
          uri: `at://${curatorId.value}/${collections.card}/nonexistent-card`,
          cid: 'card-cid',
        },
        addedBy: curatorId.value,
        addedAt: new Date().toISOString(),
      };

      const request = {
        atUri: `at://${curatorId.value}/${collections.collectionLink}/test-link-id`,
        cid: 'link-cid',
        eventType: 'create' as const,
        record: linkRecord,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true); // Should not fail firehose processing

      // Verify collection was not modified
      const savedCollection = await collectionRepository.findById(
        collection.collectionId,
      );
      expect(savedCollection.isOk()).toBe(true);
      const collectionFromRepo = savedCollection.unwrap()!;
      expect(collectionFromRepo.cardIds).toHaveLength(0);
    });

    it('should handle missing record gracefully', async () => {
      const collections = configService.getAtProtoCollections();
      const request = {
        atUri: `at://${curatorId.value}/${collections.collectionLink}/test-link-id`,
        cid: 'link-cid',
        eventType: 'create' as const,
        // record is undefined
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true); // Should not fail firehose processing
      expect(collectionRepository.getAllCollections()).toHaveLength(0);
    });

    it('should handle missing CID gracefully', async () => {
      const collections = configService.getAtProtoCollections();
      const linkRecord: CollectionLinkRecord = {
        $type: 'network.cosmik.collectionLink',
        collection: {
          uri: `at://${curatorId.value}/${collections.collection}/test-collection-id`,
          cid: 'collection-cid',
        },
        card: {
          uri: `at://${curatorId.value}/${collections.card}/test-card-id`,
          cid: 'card-cid',
        },
        addedBy: curatorId.value,
        addedAt: new Date().toISOString(),
      };

      const request = {
        atUri: `at://${curatorId.value}/${collections.collectionLink}/test-link-id`,
        cid: null,
        eventType: 'create' as const,
        record: linkRecord,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true); // Should not fail firehose processing
      expect(collectionRepository.getAllCollections()).toHaveLength(0);
    });

    it('should handle invalid AT URI gracefully', async () => {
      const linkRecord: CollectionLinkRecord = {
        $type: 'network.cosmik.collectionLink',
        collection: {
          uri: `at://${curatorId.value}/network.cosmik.collection/test-collection-id`,
          cid: 'collection-cid',
        },
        card: {
          uri: `at://${curatorId.value}/network.cosmik.card/test-card-id`,
          cid: 'card-cid',
        },
        addedBy: curatorId.value,
        addedAt: new Date().toISOString(),
      };

      const request = {
        atUri: 'invalid-uri',
        cid: 'link-cid',
        eventType: 'create' as const,
        record: linkRecord,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true); // Should not fail firehose processing
      expect(collectionRepository.getAllCollections()).toHaveLength(0);
    });
  });

  describe('Collection Link Deletion Events', () => {
    it('should process collection link delete event successfully', async () => {
      // Create a URL card
      const urlCard = new CardBuilder()
        .withType(CardTypeEnum.URL)
        .withCuratorId(curatorId.value)
        .withUrl(URL.create('https://example.com/article').unwrap())
        .build();

      if (urlCard instanceof Error) throw urlCard;
      await cardRepository.save(urlCard);
      await cardLibraryService.addCardToLibrary(urlCard, curatorId);

      // Create a collection
      const collection = new CollectionBuilder()
        .withAuthorId(curatorId.value)
        .withName('Test Collection')
        .withPublished(true)
        .build();

      if (collection instanceof Error) throw collection;
      await collectionRepository.save(collection);

      const collections = configService.getAtProtoCollections();

      // Set up published record IDs so the resolution service can find them
      const collectionAtUri = `at://${curatorId.value}/${collections.collection}/${collection.collectionId.getStringValue()}`;
      const cardAtUri = `at://${curatorId.value}/${collections.card}/${urlCard.cardId.getStringValue()}`;

      const collectionPublishedRecordId = PublishedRecordId.create({
        uri: collectionAtUri,
        cid: 'collection-cid',
      });
      collection.markAsPublished(collectionPublishedRecordId);
      await collectionRepository.save(collection);

      const cardPublishedRecordId = PublishedRecordId.create({
        uri: cardAtUri,
        cid: 'card-cid',
      });
      urlCard.markAsPublished(cardPublishedRecordId);
      await cardRepository.save(urlCard);

      // Add card to collection first
      const addResult = await cardCollectionService.addCardToCollection(
        urlCard,
        collection.collectionId,
        curatorId,
      );
      if (addResult.isErr()) throw addResult.error;

      // Create a collection link with published record ID that can be resolved
      const linkAtUri = `at://${curatorId.value}/${collections.collectionLink}/${collection.collectionId.getStringValue()}-${urlCard.cardId.getStringValue()}`;
      const linkPublishedRecordId = PublishedRecordId.create({
        uri: linkAtUri,
        cid: 'link-cid',
      });

      // Add the link to the collection so it can be found by the resolution service
      const updatedCollection = addResult.value;
      const cardLink = updatedCollection.cardLinks.find((link) =>
        link.cardId.equals(urlCard.cardId),
      );
      if (cardLink) {
        cardLink.publishedRecordId = linkPublishedRecordId;
        await collectionRepository.save(updatedCollection);
      }

      const request = {
        atUri: linkAtUri,
        cid: null, // CID can be null for delete events
        eventType: 'delete' as const,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);

      // Verify card was removed from collection
      const finalCollection = await collectionRepository.findById(
        collection.collectionId,
      );
      expect(finalCollection.isOk()).toBe(true);
      const collectionFromRepo = finalCollection.unwrap()!;
      expect(
        collectionFromRepo.cardIds.some((id) => id.equals(urlCard.cardId)),
      ).toBe(false);

      // Verify no unpublishing occurred (firehose event should skip unpublishing)
      const removedLinks = collectionPublisher.getAllRemovedLinks();
      expect(removedLinks).toHaveLength(0);
    });

    it('should handle delete event for non-existent link gracefully', async () => {
      const collections = configService.getAtProtoCollections();
      const request = {
        atUri: `at://${curatorId.value}/${collections.collectionLink}/nonexistent-link`,
        cid: null,
        eventType: 'delete' as const,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true); // Should not fail firehose processing
      expect(collectionRepository.getAllCollections()).toHaveLength(0);
    });

    it('should handle delete event with invalid AT URI gracefully', async () => {
      const request = {
        atUri: 'invalid-uri',
        cid: null,
        eventType: 'delete' as const,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true); // Should not fail firehose processing
      expect(collectionRepository.getAllCollections()).toHaveLength(0);
    });
  });

  describe('Collection Link Update Events', () => {
    it('should ignore collection link update events', async () => {
      const collections = configService.getAtProtoCollections();
      const linkRecord: CollectionLinkRecord = {
        $type: 'network.cosmik.collectionLink',
        collection: {
          uri: `at://${curatorId.value}/${collections.collection}/test-collection-id`,
          cid: 'collection-cid',
        },
        card: {
          uri: `at://${curatorId.value}/${collections.card}/test-card-id`,
          cid: 'card-cid',
        },
        addedBy: curatorId.value,
        addedAt: new Date().toISOString(),
      };

      const request = {
        atUri: `at://${curatorId.value}/${collections.collectionLink}/test-link-id`,
        cid: 'link-cid',
        eventType: 'update' as const,
        record: linkRecord,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true); // Should not fail firehose processing
      expect(collectionRepository.getAllCollections()).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle AT URI resolution service errors gracefully', async () => {
      const collections = configService.getAtProtoCollections();
      const request = {
        atUri: `at://${curatorId.value}/${collections.collectionLink}/unresolvable-link`,
        cid: null,
        eventType: 'delete' as const,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true); // Should not fail firehose processing
    });

    it('should handle use case execution failures gracefully', async () => {
      // Create a URL card
      const urlCard = new CardBuilder()
        .withType(CardTypeEnum.URL)
        .withCuratorId(curatorId.value)
        .build();

      if (urlCard instanceof Error) throw urlCard;
      await cardRepository.save(urlCard);

      // Create a collection
      const collection = new CollectionBuilder()
        .withAuthorId(curatorId.value)
        .withName('Test Collection')
        .build();

      if (collection instanceof Error) throw collection;
      await collectionRepository.save(collection);

      // Configure publisher to fail
      collectionPublisher.setShouldFail(true);

      const collections = configService.getAtProtoCollections();
      const linkRecord: CollectionLinkRecord = {
        $type: 'network.cosmik.collectionLink',
        collection: {
          uri: `at://${curatorId.value}/${collections.collection}/test-collection-id`,
          cid: 'collection-cid',
        },
        card: {
          uri: `at://${curatorId.value}/${collections.card}/test-card-id`,
          cid: 'card-cid',
        },
        addedBy: curatorId.value,
        addedAt: new Date().toISOString(),
      };

      const request = {
        atUri: `at://${curatorId.value}/${collections.collectionLink}/test-link-id`,
        cid: 'link-cid',
        eventType: 'create' as const,
        record: linkRecord,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true); // Should not fail firehose processing
    });
  });
});
