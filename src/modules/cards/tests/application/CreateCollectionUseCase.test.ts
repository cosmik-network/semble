import { CreateCollectionUseCase } from '../../application/useCases/commands/CreateCollectionUseCase';
import { InMemoryCollectionRepository } from '../utils/InMemoryCollectionRepository';
import { FakeCollectionPublisher } from '../utils/FakeCollectionPublisher';
import { CuratorId } from '../../domain/value-objects/CuratorId';
import { CollectionAccessType } from '../../domain/Collection';
import { FakeEventPublisher } from '../utils/FakeEventPublisher';
import { CollectionCreatedEvent } from '../../domain/events/CollectionCreatedEvent';
import { EventNames } from 'src/shared/infrastructure/events/EventConfig';

describe('CreateCollectionUseCase', () => {
  let useCase: CreateCollectionUseCase;
  let collectionRepository: InMemoryCollectionRepository;
  let collectionPublisher: FakeCollectionPublisher;
  let eventPublisher: FakeEventPublisher;
  let curatorId: CuratorId;

  beforeEach(() => {
    collectionRepository = InMemoryCollectionRepository.getInstance();
    collectionPublisher = new FakeCollectionPublisher();
    eventPublisher = new FakeEventPublisher();
    useCase = new CreateCollectionUseCase(
      collectionRepository,
      collectionPublisher,
    );
    curatorId = CuratorId.create('did:plc:testcurator').unwrap();
  });

  afterEach(() => {
    collectionRepository.clear();
    collectionPublisher.clear();
    eventPublisher.clear();
  });

  describe('Basic collection creation', () => {
    it('should successfully create a collection', async () => {
      const request = {
        name: 'My Test Collection',
        description: 'A collection for testing purposes',
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.collectionId).toBeDefined();

      // Verify collection was saved
      const savedCollections = collectionRepository.getAllCollections();
      expect(savedCollections).toHaveLength(1);

      const savedCollection = savedCollections[0]!;
      expect(savedCollection.name.value).toBe('My Test Collection');
      expect(savedCollection.description?.value).toBe(
        'A collection for testing purposes',
      );
      expect(savedCollection.authorId.equals(curatorId)).toBe(true);
      expect(savedCollection.accessType).toBe(CollectionAccessType.CLOSED);
      expect(savedCollection.isPublished).toBe(true);
      expect(savedCollection.publishedRecordId).toBeDefined();
    });

    it('should create collection without description', async () => {
      const request = {
        name: 'Collection Without Description',
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.collectionId).toBeDefined();

      // Verify collection was saved
      const savedCollections = collectionRepository.getAllCollections();
      expect(savedCollections).toHaveLength(1);

      const savedCollection = savedCollections[0]!;
      expect(savedCollection.name.value).toBe('Collection Without Description');
      expect(savedCollection.description).toBeUndefined();
    });

    it('should publish collection after creation', async () => {
      const request = {
        name: 'Published Collection',
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);

      // Verify collection was published
      const publishedCollections =
        collectionPublisher.getPublishedCollections();
      expect(publishedCollections).toHaveLength(1);

      const publishedCollection = publishedCollections[0]!;
      expect(publishedCollection.name.value).toBe('Published Collection');
    });
  });

  describe('Validation', () => {
    it('should fail with invalid curator ID', async () => {
      const request = {
        name: 'Test Collection',
        curatorId: 'invalid-curator-id',
      };

      const result = await useCase.execute(request);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Invalid curator ID');
      }
    });

    it('should fail with empty collection name', async () => {
      const request = {
        name: '',
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain(
          'Collection name cannot be empty',
        );
      }
    });

    it('should fail with collection name that is too long', async () => {
      const request = {
        name: 'a'.repeat(101), // Exceeds MAX_LENGTH
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Collection name cannot exceed');
      }
    });

    it('should fail with description that is too long', async () => {
      const request = {
        name: 'Valid Collection Name',
        description: 'a'.repeat(501), // Exceeds MAX_LENGTH
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain(
          'Collection description cannot exceed',
        );
      }
    });

    it('should trim whitespace from collection name', async () => {
      const request = {
        name: '  Collection With Whitespace  ',
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);

      // Verify name was trimmed
      const savedCollections = collectionRepository.getAllCollections();
      const savedCollection = savedCollections[0]!;
      expect(savedCollection.name.value).toBe('Collection With Whitespace');
    });

    it('should trim whitespace from description', async () => {
      const request = {
        name: 'Test Collection',
        description: '  Description with whitespace  ',
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);

      // Verify description was trimmed
      const savedCollections = collectionRepository.getAllCollections();
      const savedCollection = savedCollections[0]!;
      expect(savedCollection.description?.value).toBe(
        'Description with whitespace',
      );
    });
  });

  describe('Publishing integration', () => {
    it('should not save collection when publishing fails', async () => {
      // Configure publisher to fail
      collectionPublisher.setShouldFail(true);

      const request = {
        name: 'Collection That Fails to Publish',
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to publish collection');
      }

      // Verify collection was NOT saved when publishing failed
      const savedCollections = collectionRepository.getAllCollections();
      expect(savedCollections).toHaveLength(0);

      // Verify no collection was published
      const publishedCollections =
        collectionPublisher.getPublishedCollections();
      expect(publishedCollections).toHaveLength(0);
    });

    it('should save collection with published record ID after successful publish', async () => {
      const request = {
        name: 'Successfully Published Collection',
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);

      // Verify collection has published record ID
      const savedCollections = collectionRepository.getAllCollections();
      const savedCollection = savedCollections[0]!;
      expect(savedCollection.isPublished).toBe(true);
      expect(savedCollection.publishedRecordId).toBeDefined();
      expect(savedCollection.publishedRecordId?.uri).toBeDefined();
      expect(savedCollection.publishedRecordId?.cid).toBeDefined();
    });
  });

  describe('Edge cases', () => {
    it('should handle maximum length collection name', async () => {
      const request = {
        name: 'a'.repeat(100), // Exactly MAX_LENGTH
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);

      // Verify name was saved correctly
      const savedCollections = collectionRepository.getAllCollections();
      const savedCollection = savedCollections[0]!;
      expect(savedCollection.name.value.length).toBe(100);
    });

    it('should handle maximum length description', async () => {
      const request = {
        name: 'Test Collection',
        description: 'a'.repeat(500), // Exactly MAX_LENGTH
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);

      // Verify description was saved correctly
      const savedCollections = collectionRepository.getAllCollections();
      const savedCollection = savedCollections[0]!;
      expect(savedCollection.description?.value.length).toBe(500);
    });

    it('should create multiple collections for same curator', async () => {
      const firstRequest = {
        name: 'First Collection',
        curatorId: curatorId.value,
      };

      const secondRequest = {
        name: 'Second Collection',
        curatorId: curatorId.value,
      };

      const firstResult = await useCase.execute(firstRequest);
      const secondResult = await useCase.execute(secondRequest);

      expect(firstResult.isOk()).toBe(true);
      expect(secondResult.isOk()).toBe(true);

      // Verify both collections were saved
      const savedCollections = collectionRepository.getAllCollections();
      expect(savedCollections).toHaveLength(2);

      const collectionNames = savedCollections.map((c) => c.name.value);
      expect(collectionNames).toContain('First Collection');
      expect(collectionNames).toContain('Second Collection');
    });
  });
});
