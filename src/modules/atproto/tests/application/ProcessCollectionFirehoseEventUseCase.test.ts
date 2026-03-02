import { ProcessCollectionFirehoseEventUseCase } from '../../application/useCases/ProcessCollectionFirehoseEventUseCase';
import { InMemoryAtUriResolutionService } from '../../../cards/tests/utils/InMemoryAtUriResolutionService';
import { CreateCollectionUseCase } from '../../../cards/application/useCases/commands/CreateCollectionUseCase';
import { UpdateCollectionUseCase } from '../../../cards/application/useCases/commands/UpdateCollectionUseCase';
import { DeleteCollectionUseCase } from '../../../cards/application/useCases/commands/DeleteCollectionUseCase';
import { InMemoryCollectionRepository } from '../../../cards/tests/utils/InMemoryCollectionRepository';
import { InMemoryConnectionRepository } from '../../../cards/tests/utils/InMemoryConnectionRepository';
import { FakeCollectionPublisher } from '../../../cards/tests/utils/FakeCollectionPublisher';
import { CollectionBuilder } from '../../../cards/tests/utils/builders/CollectionBuilder';
import { CuratorId } from '../../../cards/domain/value-objects/CuratorId';
import { Record as CollectionRecord } from '../../infrastructure/lexicon/types/network/cosmik/collection';
import { InMemoryCardRepository } from 'src/modules/cards/tests/utils/InMemoryCardRepository';
import { EnvironmentConfigService } from '../../../../shared/infrastructure/config/EnvironmentConfigService';
import { PublishedRecordId } from 'src/modules/cards/domain/value-objects/PublishedRecordId';

describe('ProcessCollectionFirehoseEventUseCase', () => {
  let useCase: ProcessCollectionFirehoseEventUseCase;
  let atUriResolutionService: InMemoryAtUriResolutionService;
  let createCollectionUseCase: CreateCollectionUseCase;
  let updateCollectionUseCase: UpdateCollectionUseCase;
  let deleteCollectionUseCase: DeleteCollectionUseCase;
  let collectionRepository: InMemoryCollectionRepository;
  let cardRepository: InMemoryCardRepository;
  let connectionRepository: InMemoryConnectionRepository;
  let collectionPublisher: FakeCollectionPublisher;
  let curatorId: CuratorId;
  let configService: EnvironmentConfigService;

  beforeEach(() => {
    configService = new EnvironmentConfigService();
    collectionRepository = InMemoryCollectionRepository.getInstance();
    cardRepository = InMemoryCardRepository.getInstance();
    connectionRepository = InMemoryConnectionRepository.getInstance();
    collectionPublisher = new FakeCollectionPublisher();

    atUriResolutionService = new InMemoryAtUriResolutionService(
      collectionRepository,
      cardRepository,
      connectionRepository,
    );

    createCollectionUseCase = new CreateCollectionUseCase(
      collectionRepository,
      collectionPublisher,
    );

    updateCollectionUseCase = new UpdateCollectionUseCase(
      collectionRepository,
      collectionPublisher,
    );

    deleteCollectionUseCase = new DeleteCollectionUseCase(
      collectionRepository,
      collectionPublisher,
    );

    useCase = new ProcessCollectionFirehoseEventUseCase(
      atUriResolutionService,
      createCollectionUseCase,
      updateCollectionUseCase,
      deleteCollectionUseCase,
    );

    curatorId = CuratorId.create('did:plc:testcurator').unwrap();
  });

  afterEach(() => {
    collectionRepository.clear();
    collectionPublisher.clear();
  });

  describe('Collection Creation Events', () => {
    it('should process collection create event successfully', async () => {
      const collections = configService.getAtProtoCollections();
      const atUri = `at://${curatorId.value}/${collections.collection}/test-collection-id`;
      const cid = 'collection-cid-123';

      const collectionRecord: CollectionRecord = {
        $type: 'network.cosmik.collection',
        name: 'Test Collection',
        description: 'A test collection from firehose',
        accessType: 'CLOSED',
        collaborators: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const request = {
        atUri,
        cid,
        eventType: 'create' as const,
        record: collectionRecord,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);

      // Verify collection was created
      const savedCollections = collectionRepository.getAllCollections();
      expect(savedCollections).toHaveLength(1);

      const collection = savedCollections[0]!;
      expect(collection.name.value).toBe('Test Collection');
      expect(collection.description?.value).toBe(
        'A test collection from firehose',
      );
      expect(collection.authorId.equals(curatorId)).toBe(true);

      // Verify published record ID was set (from firehose event)
      expect(collection.publishedRecordId).toBeDefined();
      expect(collection.publishedRecordId?.uri).toBe(atUri);
      expect(collection.publishedRecordId?.cid).toBe(cid);
      expect(collection.isPublished).toBe(true);

      // Verify no additional publishing occurred (should skip since publishedRecordId provided)
      const publishedCollections =
        collectionPublisher.getPublishedCollections();
      expect(publishedCollections).toHaveLength(0);
    });

    it('should handle collection create with missing description', async () => {
      const collections = configService.getAtProtoCollections();
      const atUri = `at://${curatorId.value}/${collections.collection}/test-collection-id`;
      const cid = 'collection-cid-123';

      const collectionRecord: CollectionRecord = {
        $type: 'network.cosmik.collection',
        name: 'Collection Without Description',
        accessType: 'OPEN',
        createdAt: new Date().toISOString(),
      };

      const request = {
        atUri,
        cid,
        eventType: 'create' as const,
        record: collectionRecord,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);

      const savedCollections = collectionRepository.getAllCollections();
      expect(savedCollections).toHaveLength(1);

      const collection = savedCollections[0]!;
      expect(collection.name.value).toBe('Collection Without Description');
      expect(collection.description).toBeUndefined();
    });

    it('should handle invalid AT URI gracefully', async () => {
      const request = {
        atUri: 'invalid-uri',
        cid: 'collection-cid',
        eventType: 'create' as const,
        record: {
          $type: 'network.cosmik.collection',
          name: 'Test Collection',
          accessType: 'CLOSED',
        } as CollectionRecord,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true); // Should not fail firehose processing
      expect(collectionRepository.getAllCollections()).toHaveLength(0);
    });

    it('should handle missing record gracefully', async () => {
      const collections = configService.getAtProtoCollections();
      const request = {
        atUri: `at://${curatorId.value}/${collections.collection}/test-collection-id`,
        cid: 'collection-cid',
        eventType: 'create' as const,
        // record is undefined
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true); // Should not fail firehose processing
      expect(collectionRepository.getAllCollections()).toHaveLength(0);
    });

    it('should handle missing CID gracefully', async () => {
      const collections = configService.getAtProtoCollections();
      const request = {
        atUri: `at://${curatorId.value}/${collections.collection}/test-collection-id`,
        cid: null,
        eventType: 'create' as const,
        record: {
          $type: 'network.cosmik.collection',
          name: 'Test Collection',
          accessType: 'CLOSED',
        } as CollectionRecord,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true); // Should not fail firehose processing
      expect(collectionRepository.getAllCollections()).toHaveLength(0);
    });
  });

  describe('Collection Update Events', () => {
    it('should process collection update event successfully', async () => {
      // First create a collection
      const collection = new CollectionBuilder()
        .withAuthorId(curatorId.value)
        .withName('Original Name')
        .withDescription('Original description')
        .build();

      if (collection instanceof Error) throw collection;

      const collections = configService.getAtProtoCollections();
      const atUri = `at://${curatorId.value}/${collections.collection}/${collection.collectionId}`;
      const cid = 'updated-collection-cid-123';

      const publishedRecordId = PublishedRecordId.create({
        uri: atUri,
        cid: cid,
      });

      collection.markAsPublished(publishedRecordId);
      await collectionRepository.save(collection);

      const updatedCollectionRecord: CollectionRecord = {
        $type: 'network.cosmik.collection',
        name: 'Updated Collection Name',
        description: 'Updated collection description',
        accessType: 'OPEN',
        collaborators: ['did:plc:collaborator1'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const request = {
        atUri,
        cid,
        eventType: 'update' as const,
        record: updatedCollectionRecord,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);

      // Verify collection was updated
      const savedCollections = collectionRepository.getAllCollections();
      expect(savedCollections).toHaveLength(1);

      const updatedCollection = savedCollections[0]!;
      expect(updatedCollection.name.value).toBe('Updated Collection Name');
      expect(updatedCollection.description?.value).toBe(
        'Updated collection description',
      );

      // Verify published record ID was updated (from firehose event)
      expect(updatedCollection.publishedRecordId).toBeDefined();
      expect(updatedCollection.publishedRecordId?.uri).toBe(atUri);
      expect(updatedCollection.publishedRecordId?.cid).toBe(cid);

      // Verify no additional publishing occurred (should skip since publishedRecordId provided)
      const publishedCollections =
        collectionPublisher.getPublishedCollections();
      expect(publishedCollections).toHaveLength(0);
    });

    it('should handle update event for non-existent collection gracefully', async () => {
      const collections = configService.getAtProtoCollections();
      const request = {
        atUri: `at://${curatorId.value}/${collections.collection}/nonexistent-collection`,
        cid: 'collection-cid',
        eventType: 'update' as const,
        record: {
          $type: 'network.cosmik.collection',
          name: 'Updated Name',
          accessType: 'CLOSED',
        } as CollectionRecord,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true); // Should not fail firehose processing
      expect(collectionRepository.getAllCollections()).toHaveLength(0);
    });

    it('should handle update event with missing record gracefully', async () => {
      const collections = configService.getAtProtoCollections();
      const request = {
        atUri: `at://${curatorId.value}/${collections.collection}/test-collection-id`,
        cid: 'collection-cid',
        eventType: 'update' as const,
        // record is undefined
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true); // Should not fail firehose processing
      expect(collectionRepository.getAllCollections()).toHaveLength(0);
    });
  });

  describe('Collection Deletion Events', () => {
    it('should process collection delete event successfully', async () => {
      // First create a collection
      const collection = new CollectionBuilder()
        .withAuthorId(curatorId.value)
        .withName('Collection to Delete')
        .withPublished(true)
        .build();

      if (collection instanceof Error) throw collection;

      const collections = configService.getAtProtoCollections();
      const atUri = `at://${curatorId.value}/${collections.collection}/${collection.collectionId.getStringValue()}`;

      const publishedRecordId = PublishedRecordId.create({
        uri: atUri,
        cid: 'original-cid-123',
      });
      collection.markAsPublished(publishedRecordId);
      await collectionRepository.save(collection);

      const request = {
        atUri,
        cid: null, // CID can be null for delete events
        eventType: 'delete' as const,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);

      // Verify collection was deleted
      const savedCollections = collectionRepository.getAllCollections();
      expect(savedCollections).toHaveLength(0);

      // Verify no unpublishing occurred (firehose event should skip unpublishing)
      const unpublishedCollections =
        collectionPublisher.getUnpublishedCollections();
      expect(unpublishedCollections).toHaveLength(0);
    });

    it('should handle delete event for non-existent collection gracefully', async () => {
      const collections = configService.getAtProtoCollections();
      const request = {
        atUri: `at://${curatorId.value}/${collections.collection}/nonexistent-collection`,
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

  describe('Error Handling', () => {
    it('should handle AT URI resolution service errors gracefully', async () => {
      const collections = configService.getAtProtoCollections();
      const request = {
        atUri: `at://${curatorId.value}/${collections.collection}/unresolvable-collection`,
        cid: 'collection-cid',
        eventType: 'update' as const,
        record: {
          $type: 'network.cosmik.collection',
          name: 'Test Collection',
          accessType: 'CLOSED',
        } as CollectionRecord,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true); // Should not fail firehose processing
    });

    it('should handle use case execution failures gracefully', async () => {
      // Configure publisher to fail
      collectionPublisher.setShouldFail(true);

      const collections = configService.getAtProtoCollections();
      const request = {
        atUri: `at://${curatorId.value}/${collections.collection}/test-collection-id`,
        cid: 'collection-cid',
        eventType: 'create' as const,
        record: {
          $type: 'network.cosmik.collection',
          name: 'Test Collection',
          accessType: 'CLOSED',
        } as CollectionRecord,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true); // Should not fail firehose processing
      expect(collectionRepository.getAllCollections()).toHaveLength(1); // Collection saved but not published
    });
  });
});
