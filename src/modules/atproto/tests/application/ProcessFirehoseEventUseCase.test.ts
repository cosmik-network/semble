import { ProcessFirehoseEventUseCase } from '../../application/useCases/ProcessFirehoseEventUseCase';
import { InMemoryFirehoseEventDuplicationService } from '../utils/InMemoryFirehoseEventDuplicationService';
import { ProcessCardFirehoseEventUseCase } from '../../application/useCases/ProcessCardFirehoseEventUseCase';
import { ProcessCollectionFirehoseEventUseCase } from '../../application/useCases/ProcessCollectionFirehoseEventUseCase';
import { ProcessCollectionLinkFirehoseEventUseCase } from '../../application/useCases/ProcessCollectionLinkFirehoseEventUseCase';
import { ProcessMarginBookmarkFirehoseEventUseCase } from '../../application/useCases/ProcessMarginBookmarkFirehoseEventUseCase';
import { ProcessMarginCollectionFirehoseEventUseCase } from '../../application/useCases/ProcessMarginCollectionFirehoseEventUseCase';
import { ProcessMarginCollectionItemFirehoseEventUseCase } from '../../application/useCases/ProcessMarginCollectionItemFirehoseEventUseCase';
import { ProcessCollectionLinkRemovalFirehoseEventUseCase } from '../../application/useCases/ProcessCollectionLinkRemovalFirehoseEventUseCase';
import { ProcessFollowFirehoseEventUseCase } from '../../application/useCases/ProcessFollowFirehoseEventUseCase';
import { EnvironmentConfigService } from '../../../../shared/infrastructure/config/EnvironmentConfigService';
import { InMemoryAtUriResolutionService } from '../../../cards/tests/utils/InMemoryAtUriResolutionService';
import { AddUrlToLibraryUseCase } from '../../../cards/application/useCases/commands/AddUrlToLibraryUseCase';
import { UpdateUrlCardAssociationsUseCase } from '../../../cards/application/useCases/commands/UpdateUrlCardAssociationsUseCase';
import { RemoveCardFromLibraryUseCase } from '../../../cards/application/useCases/commands/RemoveCardFromLibraryUseCase';
import { CreateCollectionUseCase } from '../../../cards/application/useCases/commands/CreateCollectionUseCase';
import { UpdateCollectionUseCase } from '../../../cards/application/useCases/commands/UpdateCollectionUseCase';
import { DeleteCollectionUseCase } from '../../../cards/application/useCases/commands/DeleteCollectionUseCase';
import { InMemoryCardRepository } from '../../../cards/tests/utils/InMemoryCardRepository';
import { InMemoryCollectionRepository } from '../../../cards/tests/utils/InMemoryCollectionRepository';
import { FakeCardPublisher } from '../../../cards/tests/utils/FakeCardPublisher';
import { FakeCollectionPublisher } from '../../../cards/tests/utils/FakeCollectionPublisher';
import { FakeMetadataService } from '../../../cards/tests/utils/FakeMetadataService';
import { FakeEventPublisher } from '../../../cards/tests/utils/FakeEventPublisher';
import { CardLibraryService } from '../../../cards/domain/services/CardLibraryService';
import { CardCollectionService } from '../../../cards/domain/services/CardCollectionService';
import { FollowTargetUseCase } from '../../../user/application/useCases/commands/FollowTargetUseCase';
import { UnfollowTargetUseCase } from '../../../user/application/useCases/commands/UnfollowTargetUseCase';
import { InMemoryFollowsRepository } from '../../../user/tests/infrastructure/InMemoryFollowsRepository';
import { InMemoryUserRepository } from '../../../user/tests/infrastructure/InMemoryUserRepository';
import { FakeFollowPublisher } from '../../infrastructure/publishers/FakeFollowPublisher';
import { Record as CardRecord } from '../../infrastructure/lexicon/types/network/cosmik/card';
import { Record as CollectionRecord } from '../../infrastructure/lexicon/types/network/cosmik/collection';
import { Record as CollectionLinkRecord } from '../../infrastructure/lexicon/types/network/cosmik/collectionLink';

describe('ProcessFirehoseEventUseCase', () => {
  let useCase: ProcessFirehoseEventUseCase;
  let duplicationService: InMemoryFirehoseEventDuplicationService;
  let configService: EnvironmentConfigService;
  let processCardFirehoseEventUseCase: ProcessCardFirehoseEventUseCase;
  let processCollectionFirehoseEventUseCase: ProcessCollectionFirehoseEventUseCase;
  let processCollectionLinkFirehoseEventUseCase: ProcessCollectionLinkFirehoseEventUseCase;
  let processMarginBookmarkFirehoseEventUseCase: ProcessMarginBookmarkFirehoseEventUseCase;
  let processMarginCollectionFirehoseEventUseCase: ProcessMarginCollectionFirehoseEventUseCase;
  let processMarginCollectionItemFirehoseEventUseCase: ProcessMarginCollectionItemFirehoseEventUseCase;
  let processCollectionLinkRemovalFirehoseEventUseCase: ProcessCollectionLinkRemovalFirehoseEventUseCase;
  let processFollowFirehoseEventUseCase: ProcessFollowFirehoseEventUseCase;

  // Dependencies for real use cases
  let atUriResolutionService: InMemoryAtUriResolutionService;
  let cardRepository: InMemoryCardRepository;
  let collectionRepository: InMemoryCollectionRepository;
  let cardPublisher: FakeCardPublisher;
  let collectionPublisher: FakeCollectionPublisher;
  let metadataService: FakeMetadataService;
  let eventPublisher: FakeEventPublisher;
  let cardLibraryService: CardLibraryService;
  let cardCollectionService: CardCollectionService;
  let addUrlToLibraryUseCase: AddUrlToLibraryUseCase;
  let updateUrlCardAssociationsUseCase: UpdateUrlCardAssociationsUseCase;
  let removeCardFromLibraryUseCase: RemoveCardFromLibraryUseCase;
  let createCollectionUseCase: CreateCollectionUseCase;
  let updateCollectionUseCase: UpdateCollectionUseCase;
  let deleteCollectionUseCase: DeleteCollectionUseCase;
  let followTargetUseCase: FollowTargetUseCase;
  let unfollowTargetUseCase: UnfollowTargetUseCase;
  let followsRepository: InMemoryFollowsRepository;
  let userRepository: InMemoryUserRepository;
  let followPublisher: FakeFollowPublisher;

  beforeEach(() => {
    duplicationService = new InMemoryFirehoseEventDuplicationService();
    configService = new EnvironmentConfigService();

    // Set up all the real dependencies
    cardRepository = InMemoryCardRepository.getInstance();
    collectionRepository = InMemoryCollectionRepository.getInstance();
    cardPublisher = new FakeCardPublisher();
    collectionPublisher = new FakeCollectionPublisher();
    metadataService = new FakeMetadataService();
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

    // Create use cases for card processing
    addUrlToLibraryUseCase = new AddUrlToLibraryUseCase(
      cardRepository,
      metadataService,
      cardLibraryService,
      cardCollectionService,
      eventPublisher,
    );

    updateUrlCardAssociationsUseCase = new UpdateUrlCardAssociationsUseCase(
      cardRepository,
      cardLibraryService,
      cardCollectionService,
      eventPublisher,
    );

    removeCardFromLibraryUseCase = new RemoveCardFromLibraryUseCase(
      cardRepository,
      cardLibraryService,
      eventPublisher,
    );

    // Create use cases for collection processing
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

    // Create real use case instances
    processCardFirehoseEventUseCase = new ProcessCardFirehoseEventUseCase(
      atUriResolutionService,
      addUrlToLibraryUseCase,
      updateUrlCardAssociationsUseCase,
      removeCardFromLibraryUseCase,
      cardRepository,
    );

    processCollectionFirehoseEventUseCase =
      new ProcessCollectionFirehoseEventUseCase(
        atUriResolutionService,
        createCollectionUseCase,
        updateCollectionUseCase,
        deleteCollectionUseCase,
      );

    processCollectionLinkFirehoseEventUseCase =
      new ProcessCollectionLinkFirehoseEventUseCase(
        atUriResolutionService,
        updateUrlCardAssociationsUseCase,
      );

    processMarginBookmarkFirehoseEventUseCase =
      new ProcessMarginBookmarkFirehoseEventUseCase(
        atUriResolutionService,
        addUrlToLibraryUseCase,
        removeCardFromLibraryUseCase,
      );

    processMarginCollectionFirehoseEventUseCase =
      new ProcessMarginCollectionFirehoseEventUseCase(
        atUriResolutionService,
        createCollectionUseCase,
        updateCollectionUseCase,
        deleteCollectionUseCase,
      );

    processMarginCollectionItemFirehoseEventUseCase =
      new ProcessMarginCollectionItemFirehoseEventUseCase(
        atUriResolutionService,
        updateUrlCardAssociationsUseCase,
      );
    processCollectionLinkRemovalFirehoseEventUseCase =
      new ProcessCollectionLinkRemovalFirehoseEventUseCase(
        atUriResolutionService,
        updateUrlCardAssociationsUseCase,
      );

    // Set up follow-related dependencies
    followsRepository = InMemoryFollowsRepository.getInstance();
    userRepository = InMemoryUserRepository.getInstance();
    followPublisher = new FakeFollowPublisher();

    followTargetUseCase = new FollowTargetUseCase(
      followsRepository,
      userRepository,
      collectionRepository,
      followPublisher,
      eventPublisher,
    );

    unfollowTargetUseCase = new UnfollowTargetUseCase(
      followsRepository,
      followPublisher,
      eventPublisher,
    );

    processFollowFirehoseEventUseCase = new ProcessFollowFirehoseEventUseCase(
      atUriResolutionService,
      followTargetUseCase,
      unfollowTargetUseCase,
      followsRepository,
      userRepository,
      collectionRepository,
    );

    useCase = new ProcessFirehoseEventUseCase(
      duplicationService,
      configService,
      processCardFirehoseEventUseCase,
      processCollectionFirehoseEventUseCase,
      processCollectionLinkFirehoseEventUseCase,
      processMarginBookmarkFirehoseEventUseCase,
      processMarginCollectionFirehoseEventUseCase,
      processMarginCollectionItemFirehoseEventUseCase,
      processCollectionLinkRemovalFirehoseEventUseCase,
      processFollowFirehoseEventUseCase,
    );
  });

  afterEach(() => {
    duplicationService.clear();
    cardRepository.clear();
    collectionRepository.clear();
    cardPublisher.clear();
    collectionPublisher.clear();
    metadataService.clear();
    eventPublisher.clear();
  });

  describe('Event Routing', () => {
    it('should route card events to ProcessCardFirehoseEventUseCase', async () => {
      const collections = configService.getAtProtoCollections();
      const cardRecord: CardRecord = {
        $type: 'network.cosmik.card',
        type: 'URL',
        content: {
          $type: 'network.cosmik.card#urlContent',
          url: 'https://example.com',
        },
      };

      const request = {
        atUri: `at://did:plc:test/${collections.card}/test-card-id`,
        cid: 'test-cid',
        eventType: 'create' as const,
        record: cardRecord,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);

      // Verify the card was actually created in the repository
      const savedCards = cardRepository.getAllCards();
      expect(savedCards).toHaveLength(1);
      expect(savedCards[0]?.content.type).toBe('URL');
    });

    it('should route collection events to ProcessCollectionFirehoseEventUseCase', async () => {
      const collections = configService.getAtProtoCollections();
      const collectionRecord: CollectionRecord = {
        $type: 'network.cosmik.collection',
        name: 'Test Collection',
        accessType: 'CLOSED',
      };

      const request = {
        atUri: `at://did:plc:test/${collections.collection}/test-collection-id`,
        cid: 'test-cid',
        eventType: 'create' as const,
        record: collectionRecord,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);

      // Verify the collection was actually created in the repository
      const savedCollections = collectionRepository.getAllCollections();
      expect(savedCollections).toHaveLength(1);
      expect(savedCollections[0]?.name.value).toBe('Test Collection');
    });

    it('should route collection link events to ProcessCollectionLinkFirehoseEventUseCase', async () => {
      const collections = configService.getAtProtoCollections();
      const linkRecord: CollectionLinkRecord = {
        $type: 'network.cosmik.collectionLink',
        collection: {
          uri: 'at://did:plc:test/network.cosmik.collection/collection-id',
          cid: 'collection-cid',
        },
        card: {
          uri: 'at://did:plc:test/network.cosmik.card/card-id',
          cid: 'card-cid',
        },
        addedBy: 'did:plc:test',
        addedAt: new Date().toISOString(),
      };

      const request = {
        atUri: `at://did:plc:test/${collections.collectionLink}/test-link-id`,
        cid: 'test-cid',
        eventType: 'create' as const,
        record: linkRecord,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);
      // Collection link processing will gracefully handle missing referenced entities
      // so we just verify the request was processed without error
    });

    it('should handle unknown collection types', async () => {
      const request = {
        atUri: 'at://did:plc:test/unknown.collection.type/test-id',
        cid: 'test-cid',
        eventType: 'create' as const,
        record: {} as any,
      };

      const result = await useCase.execute(request);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Unknown collection type');
      }
      // No specific side effects to verify for unknown collection types
    });
  });

  describe('Duplicate Detection', () => {
    it('should skip processing duplicate events', async () => {
      const collections = configService.getAtProtoCollections();
      const atUri = `at://did:plc:test/${collections.card}/test-card-id`;
      const cid = 'test-cid';
      const eventType = 'create';

      // Mark event as already processed
      await duplicationService.markEventAsProcessed(atUri, cid, eventType);

      const request = {
        atUri,
        cid,
        eventType: eventType as 'create',
        record: {
          $type: 'network.cosmik.card',
          type: 'URL',
          content: {
            $type: 'network.cosmik.card#urlContent',
            url: 'https://example.com',
          },
        } as CardRecord,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);
      // Event was marked as duplicate, so no processing should occur
      expect(cardRepository.getAllCards()).toHaveLength(0);
    });

    it('should process non-duplicate events', async () => {
      const collections = configService.getAtProtoCollections();
      const request = {
        atUri: `at://did:plc:test/${collections.card}/test-card-id`,
        cid: 'test-cid',
        eventType: 'create' as const,
        record: {
          $type: 'network.cosmik.card',
          type: 'URL',
          content: {
            $type: 'network.cosmik.card#urlContent',
            url: 'https://example.com',
          },
        } as CardRecord,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);

      // Verify the card was actually created
      const savedCards = cardRepository.getAllCards();
      expect(savedCards).toHaveLength(1);
    });

    it('should handle duplication service errors', async () => {
      // Configure duplication service to fail
      duplicationService.setShouldFail(true);

      const collections = configService.getAtProtoCollections();
      const request = {
        atUri: `at://did:plc:test/${collections.card}/test-card-id`,
        cid: 'test-cid',
        eventType: 'create' as const,
        record: {
          $type: 'network.cosmik.card',
          type: 'URL',
          content: {
            $type: 'network.cosmik.card#urlContent',
            url: 'https://example.com',
          },
        } as CardRecord,
      };

      const result = await useCase.execute(request);

      expect(result.isErr()).toBe(true);

      // No processing should have occurred
      expect(cardRepository.getAllCards()).toHaveLength(0);
    });
  });

  describe('AT URI Validation', () => {
    it('should handle invalid AT URI format', async () => {
      const request = {
        atUri: 'invalid-uri-format',
        cid: 'test-cid',
        eventType: 'create' as const,
        record: {} as any,
      };

      const result = await useCase.execute(request);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Invalid AT URI');
      }

      // No processing should have occurred
      expect(cardRepository.getAllCards()).toHaveLength(0);
      expect(collectionRepository.getAllCollections()).toHaveLength(0);
    });

    it('should handle malformed AT URI', async () => {
      const request = {
        atUri: 'at://did:plc:test', // Missing collection and rkey
        cid: 'test-cid',
        eventType: 'create' as const,
        record: {} as any,
      };

      const result = await useCase.execute(request);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Invalid AT URI');
      }
    });
  });

  describe('Event Types', () => {
    it('should handle create events', async () => {
      const collections = configService.getAtProtoCollections();
      const request = {
        atUri: `at://did:plc:test/${collections.card}/test-card-id`,
        cid: 'test-cid',
        eventType: 'create' as const,
        record: {
          $type: 'network.cosmik.card',
          type: 'URL',
          content: {
            $type: 'network.cosmik.card#urlContent',
            url: 'https://example.com',
          },
        } as CardRecord,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);

      // Verify the card was created
      const savedCards = cardRepository.getAllCards();
      expect(savedCards).toHaveLength(1);
    });

    it('should handle update events', async () => {
      const collections = configService.getAtProtoCollections();
      const request = {
        atUri: `at://did:plc:test/${collections.collection}/test-collection-id`,
        cid: 'test-cid',
        eventType: 'update' as const,
        record: {
          $type: 'network.cosmik.collection',
          name: 'Updated Collection',
          accessType: 'OPEN',
        } as CollectionRecord,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);

      // Verify the collection wasnt updated since it didn't exist before
      const savedCollections = collectionRepository.getAllCollections();
      expect(savedCollections).toHaveLength(0);
    });

    it('should handle delete events', async () => {
      const collections = configService.getAtProtoCollections();
      const request = {
        atUri: `at://did:plc:test/${collections.collectionLink}/test-link-id`,
        cid: null, // CID can be null for delete events
        eventType: 'delete' as const,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);
      // Collection link processing handles missing entities gracefully
    });
  });

  describe('Error Handling', () => {
    it('should handle metadata service failures gracefully', async () => {
      const collections = configService.getAtProtoCollections();

      // Configure metadata service to fail
      metadataService.setShouldFail(true);

      const request = {
        atUri: `at://did:plc:test/${collections.card}/test-card-id`,
        cid: 'test-cid',
        eventType: 'create' as const,
        record: {
          $type: 'network.cosmik.card',
          type: 'URL',
          content: {
            $type: 'network.cosmik.card#urlContent',
            url: 'https://example.com',
          },
        } as CardRecord,
      };

      const result = await useCase.execute(request);

      // The card processor handles metadata failures gracefully
      expect(result.isOk()).toBe(true);

      expect(cardRepository.getAllCards()).toHaveLength(1);
    });

    it('should handle publisher failures gracefully', async () => {
      const collections = configService.getAtProtoCollections();

      // Configure collection publisher to fail
      collectionPublisher.setShouldFail(true);

      const request = {
        atUri: `at://did:plc:test/${collections.collection}/test-collection-id`,
        cid: 'test-cid',
        eventType: 'create' as const,
        record: {
          $type: 'network.cosmik.collection',
          name: 'Test Collection',
          accessType: 'CLOSED',
        } as CollectionRecord,
      };

      const result = await useCase.execute(request);

      // The collection processor handles publisher failures gracefully
      expect(result.isOk()).toBe(true);

      // Collection should still be saved even if publishing fails
      expect(collectionRepository.getAllCollections()).toHaveLength(1);
    });
  });
});
