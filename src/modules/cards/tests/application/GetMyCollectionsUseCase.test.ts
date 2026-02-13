import { InMemoryCollectionQueryRepository } from '../utils/InMemoryCollectionQueryRepository';
import { InMemoryCollectionRepository } from '../utils/InMemoryCollectionRepository';
import { FakeProfileService } from '../utils/FakeProfileService';
import { FakeIdentityResolutionService } from '../utils/FakeIdentityResolutionService';
import { CollectionBuilder } from '../utils/builders/CollectionBuilder';
import { CuratorId } from '../../domain/value-objects/CuratorId';
import { Collection, CollectionAccessType } from '../../domain/Collection';
import {
  CollectionSortField,
  SortOrder,
} from '../../domain/ICollectionQueryRepository';
import { UserProfile } from '../../domain/services/IProfileService';
import { GetCollectionsUseCase } from '../../application/useCases/queries/GetCollectionsUseCase';
import { InMemoryFollowsRepository } from '../../../user/tests/infrastructure/InMemoryFollowsRepository';

describe('GetMyCollectionsUseCase', () => {
  let useCase: GetCollectionsUseCase;
  let collectionQueryRepo: InMemoryCollectionQueryRepository;
  let collectionRepo: InMemoryCollectionRepository;
  let profileService: FakeProfileService;
  let identityResolutionService: FakeIdentityResolutionService;
  let followsRepository: InMemoryFollowsRepository;
  let curatorId: CuratorId;
  let userProfile: UserProfile;

  beforeEach(() => {
    collectionRepo = InMemoryCollectionRepository.getInstance();
    collectionQueryRepo = new InMemoryCollectionQueryRepository(collectionRepo);
    profileService = new FakeProfileService();
    identityResolutionService = new FakeIdentityResolutionService();
    followsRepository = InMemoryFollowsRepository.getInstance();
    useCase = new GetCollectionsUseCase(
      collectionQueryRepo,
      profileService,
      identityResolutionService,
      followsRepository,
    );

    curatorId = CuratorId.create('did:plc:testcurator').unwrap();
    userProfile = {
      id: curatorId.value,
      name: 'Test Curator',
      handle: 'testcurator.bsky.social',
      avatarUrl: 'https://example.com/avatar.jpg',
      bio: 'Test curator bio',
    };

    profileService.addProfile(userProfile);
  });

  afterEach(() => {
    collectionRepo.clear();
    collectionQueryRepo.clear();
    profileService.clear();
    identityResolutionService.clear();
  });

  describe('Basic functionality', () => {
    it('should return empty collections list when curator has no collections', async () => {
      const query = {
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(query);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.collections).toHaveLength(0);
      expect(response.pagination.totalCount).toBe(0);
      expect(response.pagination.currentPage).toBe(1);
      expect(response.pagination.hasMore).toBe(false);
    });

    it("should return curator's collections with profile data", async () => {
      // Create test collections using CollectionBuilder
      const collection1 = new CollectionBuilder()
        .withName('First Collection')
        .withDescription('First collection description')
        .withAuthorId(curatorId.value)
        .withAccessType(CollectionAccessType.OPEN)
        .withPublished(true)
        .buildOrThrow();

      const collection2 = new CollectionBuilder()
        .withName('Second Collection')
        .withDescription('Second collection description')
        .withAuthorId(curatorId.value)
        .withAccessType(CollectionAccessType.OPEN)
        .withPublished(true)
        .buildOrThrow();

      await collectionRepo.save(collection1);
      await collectionRepo.save(collection2);

      const query = {
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(query);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.collections).toHaveLength(2);
      expect(response.pagination.totalCount).toBe(2);

      // Verify profile data is included
      const firstCollection = response.collections[0]!;
      expect(firstCollection.author.id).toBe(userProfile.id);
      expect(firstCollection.author.name).toBe(userProfile.name);
      expect(firstCollection.author.handle).toBe(userProfile.handle);
      expect(firstCollection.author.avatarUrl).toBe(userProfile.avatarUrl);

      // Verify URI is included
      expect(firstCollection.uri).toBeDefined();
      expect(typeof firstCollection.uri).toBe('string');
      expect(firstCollection.uri?.length).toBeGreaterThan(0);
    });

    it('should only return collections for the specified curator', async () => {
      const otherCuratorId = CuratorId.create('did:plc:othercurator').unwrap();

      // Create collections for different curators using CollectionBuilder
      const myCollection = new CollectionBuilder()
        .withName('My Collection')
        .withAuthorId(curatorId.value)
        .withAccessType(CollectionAccessType.OPEN)
        .withPublished(true)
        .buildOrThrow();

      const otherCollection = new CollectionBuilder()
        .withName('Other Collection')
        .withAuthorId(otherCuratorId.value)
        .withAccessType(CollectionAccessType.OPEN)
        .withPublished(true)
        .buildOrThrow();

      await collectionRepo.save(myCollection);
      await collectionRepo.save(otherCollection);

      const query = {
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(query);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.collections).toHaveLength(1);
      expect(response.collections[0]!.name).toBe('My Collection');

      // Verify URI is present for the collection
      expect(response.collections[0]!.uri).toBeDefined();
      expect(typeof response.collections[0]!.uri).toBe('string');
    });
  });

  describe('Pagination', () => {
    beforeEach(async () => {
      // Create multiple collections for pagination testing using CollectionBuilder
      for (let i = 1; i <= 5; i++) {
        const collection = new CollectionBuilder()
          .withName(`Collection ${i}`)
          .withAuthorId(curatorId.value)
          .withAccessType(CollectionAccessType.OPEN)
          .withPublished(true)
          .buildOrThrow();

        await collectionRepo.save(collection);
      }
    });

    it('should handle pagination correctly', async () => {
      const query = {
        curatorId: curatorId.value,
        page: 1,
        limit: 2,
      };

      const result = await useCase.execute(query);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.collections).toHaveLength(2);
      expect(response.pagination.currentPage).toBe(1);
      expect(response.pagination.totalPages).toBe(3);
      expect(response.pagination.totalCount).toBe(5);
      expect(response.pagination.hasMore).toBe(true);
      expect(response.pagination.limit).toBe(2);
    });

    it('should handle second page correctly', async () => {
      const query = {
        curatorId: curatorId.value,
        page: 2,
        limit: 2,
      };

      const result = await useCase.execute(query);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.collections).toHaveLength(2);
      expect(response.pagination.currentPage).toBe(2);
      expect(response.pagination.hasMore).toBe(true);
    });

    it('should handle last page correctly', async () => {
      const query = {
        curatorId: curatorId.value,
        page: 3,
        limit: 2,
      };

      const result = await useCase.execute(query);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.collections).toHaveLength(1);
      expect(response.pagination.currentPage).toBe(3);
      expect(response.pagination.hasMore).toBe(false);
    });

    it('should cap limit at 100', async () => {
      const query = {
        curatorId: curatorId.value,
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
      // Create collections with different properties for sorting using CollectionBuilder
      const now = new Date();

      const collection1 = new CollectionBuilder()
        .withName('Alpha Collection')
        .withAuthorId(curatorId.value)
        .withAccessType(CollectionAccessType.OPEN)
        .withCreatedAt(new Date(now.getTime() - 2000))
        .withUpdatedAt(new Date(now.getTime() - 1000))
        .withPublished(true)
        .buildOrThrow();

      const collection2 = new CollectionBuilder()
        .withName('Beta Collection')
        .withAuthorId(curatorId.value)
        .withAccessType(CollectionAccessType.OPEN)
        .withCreatedAt(new Date(now.getTime() - 1000))
        .withUpdatedAt(new Date(now.getTime() - 2000))
        .withPublished(true)
        .buildOrThrow();

      await collectionRepo.save(collection1);
      await collectionRepo.save(collection2);
    });

    it('should sort by name ascending', async () => {
      const query = {
        curatorId: curatorId.value,
        sortBy: CollectionSortField.NAME,
        sortOrder: SortOrder.ASC,
      };

      const result = await useCase.execute(query);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.collections[0]!.name).toBe('Alpha Collection');
      expect(response.collections[1]!.name).toBe('Beta Collection');
      expect(response.sorting.sortBy).toBe(CollectionSortField.NAME);
      expect(response.sorting.sortOrder).toBe(SortOrder.ASC);
    });

    it('should sort by name descending', async () => {
      const query = {
        curatorId: curatorId.value,
        sortBy: CollectionSortField.NAME,
        sortOrder: SortOrder.DESC,
      };

      const result = await useCase.execute(query);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.collections[0]!.name).toBe('Beta Collection');
      expect(response.collections[1]!.name).toBe('Alpha Collection');
    });

    it('should use default sorting when not specified', async () => {
      const query = {
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(query);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.sorting.sortBy).toBe(CollectionSortField.UPDATED_AT);
      expect(response.sorting.sortOrder).toBe(SortOrder.DESC);
    });
  });

  describe('Text search', () => {
    beforeEach(async () => {
      // Create collections with different names and descriptions for search testing using CollectionBuilder
      const collections = [
        {
          name: 'Machine Learning Papers',
          description: 'Collection of AI and ML research papers',
        },
        {
          name: 'Web Development',
          description: 'Frontend and backend development resources',
        },
        {
          name: 'Data Science',
          description: 'Statistics, machine learning, and data analysis',
        },
        {
          name: 'JavaScript Tutorials',
          description: 'Learning resources for JS development',
        },
        {
          name: 'Python Scripts',
          description: 'Useful Python automation and data scripts',
        },
      ];

      for (const collectionData of collections) {
        const collection = new CollectionBuilder()
          .withName(collectionData.name)
          .withDescription(collectionData.description)
          .withAuthorId(curatorId.value)
          .withAccessType(CollectionAccessType.OPEN)
          .withPublished(true)
          .buildOrThrow();

        await collectionRepo.save(collection);
      }
    });

    it('should return all collections when no search text provided', async () => {
      const query = {
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(query);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.collections).toHaveLength(5);
    });

    it('should search by collection name (case insensitive)', async () => {
      const query = {
        curatorId: curatorId.value,
        searchText: 'machine',
      };

      const result = await useCase.execute(query);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.collections).toHaveLength(2);
    });

    it('should search by collection description', async () => {
      const query = {
        curatorId: curatorId.value,
        searchText: 'development',
      };

      const result = await useCase.execute(query);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.collections).toHaveLength(2);

      const names = response.collections.map((c) => c.name).sort();
      expect(names).toEqual(['JavaScript Tutorials', 'Web Development']);
    });

    it('should search across both name and description', async () => {
      const query = {
        curatorId: curatorId.value,
        searchText: 'python',
      };

      const result = await useCase.execute(query);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.collections).toHaveLength(1);
      expect(response.collections[0]!.name).toBe('Python Scripts');
    });

    it('should return multiple matches for broad search terms', async () => {
      const query = {
        curatorId: curatorId.value,
        searchText: 'learning',
      };

      const result = await useCase.execute(query);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.collections).toHaveLength(3);

      const names = response.collections.map((c) => c.name).sort();
      expect(names).toEqual([
        'Data Science',
        'JavaScript Tutorials',
        'Machine Learning Papers',
      ]);
    });

    it('should return empty results for non-matching search', async () => {
      const query = {
        curatorId: curatorId.value,
        searchText: 'nonexistent',
      };

      const result = await useCase.execute(query);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.collections).toHaveLength(0);
      expect(response.pagination.totalCount).toBe(0);
    });

    it('should handle empty search text as no filter', async () => {
      const query = {
        curatorId: curatorId.value,
        searchText: '',
      };

      const result = await useCase.execute(query);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.collections).toHaveLength(5);
    });

    it('should handle whitespace-only search text as no filter', async () => {
      const query = {
        curatorId: curatorId.value,
        searchText: '   ',
      };

      const result = await useCase.execute(query);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.collections).toHaveLength(5);
    });

    it('should combine search with pagination', async () => {
      const query = {
        curatorId: curatorId.value,
        searchText: 'learning',
        page: 1,
        limit: 1,
      };

      const result = await useCase.execute(query);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.collections).toHaveLength(1);
      expect(response.pagination.totalCount).toBe(3);
      expect(response.pagination.hasMore).toBe(true);
    });

    it('should combine search with sorting', async () => {
      const query = {
        curatorId: curatorId.value,
        searchText: 'learning',
        sortBy: CollectionSortField.NAME,
        sortOrder: SortOrder.ASC,
      };

      const result = await useCase.execute(query);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.collections).toHaveLength(3);

      // Verify all collections have URIs
      response.collections.forEach((collection) => {
        expect(collection.uri).toBeDefined();
        expect(typeof collection.uri).toBe('string');
        expect(collection.uri?.length).toBeGreaterThan(0);
      });
    });

    it('should search collections with no description', async () => {
      // Create a collection without description using CollectionBuilder
      const collection = new CollectionBuilder()
        .withName('No Description Collection')
        .withAuthorId(curatorId.value)
        .withAccessType(CollectionAccessType.OPEN)
        .withPublished(true)
        .buildOrThrow();

      await collectionRepo.save(collection);

      const query = {
        curatorId: curatorId.value,
        searchText: 'description',
      };

      const result = await useCase.execute(query);

      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.collections).toHaveLength(1);
      expect(response.collections[0]!.name).toBe('No Description Collection');
    });
  });

  describe('URI validation', () => {
    it('should return consistent URIs across multiple calls', async () => {
      // Create a test collection using CollectionBuilder
      const collection = new CollectionBuilder()
        .withName('Consistent URI Test')
        .withDescription('Testing URI consistency')
        .withAuthorId(curatorId.value)
        .withAccessType(CollectionAccessType.OPEN)
        .withPublished(true)
        .buildOrThrow();

      await collectionRepo.save(collection);

      const query = {
        curatorId: curatorId.value,
      };

      // Execute the same query twice
      const result1 = await useCase.execute(query);
      const result2 = await useCase.execute(query);

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      const response1 = result1.unwrap();
      const response2 = result2.unwrap();

      expect(response1.collections).toHaveLength(1);
      expect(response2.collections).toHaveLength(1);

      // URIs should be consistent across calls
      expect(response1.collections[0]!.uri).toBe(response2.collections[0]!.uri);
    });
  });

  describe('Error handling', () => {
    it('should fail with invalid curator ID', async () => {
      const query = {
        curatorId: 'invalid-curator-id',
      };

      const result = await useCase.execute(query);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Invalid curator identifier');
      }
    });

    it('should fail when profile service fails', async () => {
      profileService.setShouldFail(true);

      const query = {
        curatorId: curatorId.value,
      };

      const result = await useCase.execute(query);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to fetch user profile');
      }
    });

    it('should fail when profile not found', async () => {
      const unknownCuratorId = CuratorId.create('did:plc:unknown').unwrap();

      const query = {
        curatorId: unknownCuratorId.value,
      };

      const result = await useCase.execute(query);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to fetch user profile');
      }
    });
  });
});
