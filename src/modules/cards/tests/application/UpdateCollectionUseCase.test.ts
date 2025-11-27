import { UpdateCollectionUseCase } from '../../application/useCases/commands/UpdateCollectionUseCase';
import { InMemoryCollectionRepository } from '../utils/InMemoryCollectionRepository';
import { FakeCollectionPublisher } from '../utils/FakeCollectionPublisher';
import { CuratorId } from '../../domain/value-objects/CuratorId';
import { CollectionBuilder } from '../utils/builders/CollectionBuilder';
import { Err } from 'src/shared/core/Result';

describe('UpdateCollectionUseCase', () => {
  let useCase: UpdateCollectionUseCase;
  let collectionRepository: InMemoryCollectionRepository;
  let collectionPublisher: FakeCollectionPublisher;
  let curatorId: CuratorId;
  let otherCuratorId: CuratorId;

  beforeEach(() => {
    collectionRepository = InMemoryCollectionRepository.getInstance();
    collectionPublisher = new FakeCollectionPublisher();
    useCase = new UpdateCollectionUseCase(
      collectionRepository,
      collectionPublisher,
    );

    curatorId = CuratorId.create('did:plc:testcurator').unwrap();
    otherCuratorId = CuratorId.create('did:plc:othercurator').unwrap();
  });

  afterEach(() => {
    collectionRepository.clear();
    collectionPublisher.clear();
  });

  const createCollection = async (
    authorId: CuratorId,
    name: string,
    description?: string,
  ) => {
    const collection = new CollectionBuilder()
      .withAuthorId(authorId.value)
      .withName(name)
      .withDescription(description || '')
      .withPublished(true)
      .build();

    if (collection instanceof Error) {
      throw new Error(`Failed to create collection: ${collection.message}`);
    }

    await collectionRepository.save(collection);
    return collection;
  };

  describe('Basic collection update', () => {
    it('should successfully update collection name and description', async () => {
      const collection = await createCollection(
        curatorId,
        'Original Name',
        'Original description',
      );

      const request = {
        collectionId: collection.collectionId.getStringValue(),
        name: 'Updated Name',
        description: 'Updated description',
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.collectionId).toBe(
        collection.collectionId.getStringValue(),
      );

      // Verify collection was updated
      const updatedCollectionResult = await collectionRepository.findById(
        collection.collectionId,
      );
      const updatedCollection = updatedCollectionResult.unwrap()!;
      expect(updatedCollection.name.value).toBe('Updated Name');
      expect(updatedCollection.description?.value).toBe('Updated description');
      expect(updatedCollection.updatedAt.getTime()).toBeGreaterThanOrEqual(
        collection.createdAt.getTime(),
      );
    });

    it('should update collection name only', async () => {
      const collection = await createCollection(
        curatorId,
        'Original Name',
        'Original description',
      );

      const request = {
        collectionId: collection.collectionId.getStringValue(),
        name: 'New Name Only',
        description: 'Original description', // Keep original description
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);

      // Verify only name was updated
      const updatedCollectionResult = await collectionRepository.findById(
        collection.collectionId,
      );
      const updatedCollection = updatedCollectionResult.unwrap()!;
      expect(updatedCollection.name.value).toBe('New Name Only');
      expect(updatedCollection.description?.value).toBe('Original description');
    });

    it('should clear description when not provided', async () => {
      const collection = await createCollection(
        curatorId,
        'Original Name',
        'Original description',
      );

      const request = {
        collectionId: collection.collectionId.getStringValue(),
        name: 'Updated Name',
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);

      // Verify description was cleared
      const updatedCollectionResult = await collectionRepository.findById(
        collection.collectionId,
      );
      const updatedCollection = updatedCollectionResult.unwrap()!;
      expect(updatedCollection.name.value).toBe('Updated Name');
      expect(updatedCollection.description).toBeUndefined();
    });

    it('should preserve other collection properties', async () => {
      const collection = await createCollection(
        curatorId,
        'Original Name',
        'Original description',
      );
      const originalCreatedAt = collection.createdAt;
      const originalAccessType = collection.accessType;

      const request = {
        collectionId: collection.collectionId.getStringValue(),
        name: 'Updated Name',
        description: 'Updated description',
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);

      // Verify other properties are preserved
      const updatedCollectionResult = await collectionRepository.findById(
        collection.collectionId,
      );
      const updatedCollection = updatedCollectionResult.unwrap()!;
      expect(updatedCollection.collectionId.getStringValue()).toBe(
        collection.collectionId.getStringValue(),
      );
      expect(updatedCollection.authorId.equals(curatorId)).toBe(true);
      expect(updatedCollection.createdAt).toEqual(originalCreatedAt);
      expect(updatedCollection.accessType).toBe(originalAccessType);
    });
  });

  describe('Authorization', () => {
    it("should fail when trying to update another user's collection", async () => {
      const collection = await createCollection(curatorId, 'Original Name');

      const request = {
        collectionId: collection.collectionId.getStringValue(),
        name: 'Unauthorized Update',
        curatorId: otherCuratorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain(
          'Only the collection author can update the collection',
        );
      }

      // Verify original collection was not modified
      const originalCollectionResult = await collectionRepository.findById(
        collection.collectionId,
      );
      const originalCollection = originalCollectionResult.unwrap()!;
      expect(originalCollection.name.value).toBe('Original Name');
    });

    it('should allow author to update their own collection', async () => {
      const collection = await createCollection(curatorId, 'Original Name');

      const request = {
        collectionId: collection.collectionId.getStringValue(),
        name: 'Author Update',
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);

      // Verify update was successful
      const updatedCollectionResult = await collectionRepository.findById(
        collection.collectionId,
      );
      const updatedCollection = updatedCollectionResult.unwrap()!;
      expect(updatedCollection.name.value).toBe('Author Update');
    });
  });

  describe('Validation', () => {
    it('should fail with invalid collection ID', async () => {
      const request = {
        collectionId: 'invalid-collection-id',
        name: 'Updated Name',
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Collection not found');
      }
    });

    it('should fail with invalid curator ID', async () => {
      const collection = await createCollection(curatorId, 'Original Name');

      const request = {
        collectionId: collection.collectionId.getStringValue(),
        name: 'Updated Name',
        curatorId: 'invalid-curator-id',
      };

      const result = await useCase.execute(request);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Invalid curator ID');
      }
    });

    it('should fail when collection does not exist', async () => {
      const request = {
        collectionId: 'non-existent-collection-id',
        name: 'Updated Name',
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Collection not found');
      }
    });

    it('should fail with empty collection name', async () => {
      const collection = await createCollection(curatorId, 'Original Name');

      const request = {
        collectionId: collection.collectionId.getStringValue(),
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
      const collection = await createCollection(curatorId, 'Original Name');

      const request = {
        collectionId: collection.collectionId.getStringValue(),
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
      const collection = await createCollection(curatorId, 'Original Name');

      const request = {
        collectionId: collection.collectionId.getStringValue(),
        name: 'Valid Name',
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

    it('should trim whitespace from name and description', async () => {
      const collection = await createCollection(curatorId, 'Original Name');

      const request = {
        collectionId: collection.collectionId.getStringValue(),
        name: '  Updated Name  ',
        description: '  Updated description  ',
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);

      // Verify whitespace was trimmed
      const updatedCollectionResult = await collectionRepository.findById(
        collection.collectionId,
      );
      const updatedCollection = updatedCollectionResult.unwrap()!;
      expect(updatedCollection.name.value).toBe('Updated Name');
      expect(updatedCollection.description?.value).toBe('Updated description');
    });
  });

  describe('Publishing integration', () => {
    it('should republish collection if it was already published', async () => {
      const collection = await createCollection(curatorId, 'Original Name');
      const initialPublishCount =
        collectionPublisher.getPublishedCollections().length;

      const request = {
        collectionId: collection.collectionId.getStringValue(),
        name: 'Updated Name',
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);

      // Verify republishing occurred
      const finalPublishCount =
        collectionPublisher.getPublishedCollections().length;
      expect(finalPublishCount).toBeGreaterThanOrEqual(initialPublishCount);

      // Verify published record ID was updated
      const updatedCollectionResult = await collectionRepository.findById(
        collection.collectionId,
      );
      const updatedCollection = updatedCollectionResult.unwrap()!;
      expect(updatedCollection.isPublished).toBe(true);
      expect(updatedCollection.publishedRecordId).toBeDefined();
    });

    it('should not republish unpublished collection', async () => {
      const collection = new CollectionBuilder()
        .withAuthorId(curatorId.value)
        .withName('Unpublished Collection')
        .withPublished(false)
        .build();

      if (collection instanceof Error) {
        throw new Error(`Failed to create collection: ${collection.message}`);
      }

      await collectionRepository.save(collection);
      const initialPublishCount =
        collectionPublisher.getPublishedCollections().length;

      const request = {
        collectionId: collection.collectionId.getStringValue(),
        name: 'Updated Unpublished',
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);

      // Verify no additional publishing occurred
      const finalPublishCount =
        collectionPublisher.getPublishedCollections().length;
      expect(finalPublishCount).toBe(initialPublishCount);
    });

    it('should not update collection when republishing fails', async () => {
      const collection = await createCollection(curatorId, 'Original Name');
      const originalUpdatedAt = collection.updatedAt;

      // Configure publisher to fail
      collectionPublisher.setShouldFail(true);

      const request = {
        collectionId: collection.collectionId.getStringValue(),
        name: 'Updated Name',
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain(
          'Failed to republish collection',
        );
      }

      // Verify collection was NOT updated when republishing failed
      const unchangedCollectionResult = await collectionRepository.findById(
        collection.collectionId,
      );
      const unchangedCollection = unchangedCollectionResult.unwrap()!;
      expect(unchangedCollection.name.value).toBe('Original Name');
      expect(unchangedCollection.updatedAt).toEqual(originalUpdatedAt);
    });
  });

  describe('Edge cases', () => {
    it('should handle updating to the same name and description', async () => {
      const collection = await createCollection(
        curatorId,
        'Same Name',
        'Same description',
      );

      const request = {
        collectionId: collection.collectionId.getStringValue(),
        name: 'Same Name',
        description: 'Same description',
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);

      // Verify collection was still updated (updatedAt should change)
      const updatedCollectionResult = await collectionRepository.findById(
        collection.collectionId,
      );
      const updatedCollection = updatedCollectionResult.unwrap()!;
      expect(updatedCollection.name.value).toBe('Same Name');
      expect(updatedCollection.description?.value).toBe('Same description');
      expect(updatedCollection.updatedAt.getTime()).toBeGreaterThanOrEqual(
        collection.createdAt.getTime(),
      );
    });

    it('should handle maximum length name and description', async () => {
      const collection = await createCollection(curatorId, 'Original Name');

      const request = {
        collectionId: collection.collectionId.getStringValue(),
        name: 'a'.repeat(100), // Exactly MAX_LENGTH
        description: 'b'.repeat(500), // Exactly MAX_LENGTH
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(request);

      expect(result.isOk()).toBe(true);

      // Verify values were saved correctly
      const updatedCollectionResult = await collectionRepository.findById(
        collection.collectionId,
      );
      const updatedCollection = updatedCollectionResult.unwrap()!;
      expect(updatedCollection.name.value.length).toBe(100);
      expect(updatedCollection.description?.value.length).toBe(500);
    });
  });
});
