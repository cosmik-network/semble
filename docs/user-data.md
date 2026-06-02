# User Data Enrichment in DDD

This document outlines Domain-Driven Design (DDD) patterns for handling data enrichment from external services, particularly for user profile data that needs to be combined with core domain data.

## The Problem

When displaying collections, cards, or other domain entities, we often need to show rich user information (names, avatars, etc.) that comes from a different bounded context or external service. The challenge is how to combine this data while maintaining clean domain boundaries.

## DDD Patterns for Data Enrichment

### 1. Application Service Orchestration (Recommended)

This is the most common DDD pattern for cross-cutting concerns like user profile enrichment:

```typescript
// Application Service coordinates between bounded contexts
export class CollectionApplicationService {
  constructor(
    private getMyCollectionsUseCase: GetMyCollectionsUseCase,
    private userProfileService: IUserProfileService, // External service
  ) {}

  async getMyCollectionsWithProfiles(query: GetMyCollectionsQuery) {
    // 1. Execute core use case
    const collectionsResult = await this.getMyCollectionsUseCase.execute(query);

    if (collectionsResult.isErr()) {
      return collectionsResult;
    }

    // 2. Enrich with external data
    const curatorIds = collectionsResult.value.collections.map(
      (c) => c.createdBy.id,
    );
    const profiles = await this.userProfileService.getProfiles(curatorIds);

    // 3. Merge data
    const enrichedCollections = collectionsResult.value.collections.map(
      (collection) => ({
        ...collection,
        createdBy: {
          ...collection.createdBy,
          ...profiles.get(collection.createdBy.id),
        },
      }),
    );

    return ok({
      ...collectionsResult.value,
      collections: enrichedCollections,
    });
  }
}
```

### 2. Domain Service for Cross-Context Integration

When the enrichment is a core business concern:

```typescript
// Domain Service in the Cards bounded context
export class CollectionEnrichmentService implements DomainService {
  constructor(
    private userContextGateway: IUserContextGateway, // Anti-corruption layer
  ) {}

  async enrichCollectionsWithCreatorInfo(
    collections: Collection[],
  ): Promise<EnrichedCollectionData[]> {
    const creatorIds = collections.map((c) => c.authorId.value);
    const creatorProfiles =
      await this.userContextGateway.getCreatorProfiles(creatorIds);

    return collections.map((collection) => ({
      collection,
      creatorProfile: creatorProfiles.get(collection.authorId.value),
    }));
  }
}
```

### 3. Anti-Corruption Layer Pattern

Protect your domain from external service changes:

```typescript
// Interface in your domain
export interface IUserContextGateway {
  getCreatorProfiles(userIds: string[]): Promise<Map<string, CreatorProfile>>;
}

// Domain model for external data
export interface CreatorProfile {
  id: string;
  displayName: string;
  avatarUrl?: string;
}

// Implementation that adapts external service
export class UserContextGateway implements IUserContextGateway {
  constructor(private externalUserService: ExternalUserAPI) {}

  async getCreatorProfiles(
    userIds: string[],
  ): Promise<Map<string, CreatorProfile>> {
    const externalProfiles =
      await this.externalUserService.getUsersByIds(userIds);

    // Transform external format to domain format
    const profiles = new Map<string, CreatorProfile>();
    externalProfiles.forEach((profile) => {
      profiles.set(profile.user_id, {
        id: profile.user_id,
        displayName: profile.full_name || profile.username,
        avatarUrl: profile.profile_image_url,
      });
    });

    return profiles;
  }
}
```

### 4. Event-Driven Enrichment (For High Performance)

When you need to avoid real-time calls:

```typescript
// Read model that's kept in sync via events
export interface EnrichedCollectionReadModel {
  id: string;
  name: string;
  description?: string;
  cardCount: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
}

// Event handler that updates read model when user profiles change
export class UserProfileUpdatedHandler {
  constructor(
    private collectionReadModelRepo: ICollectionReadModelRepository,
  ) {}

  async handle(event: UserProfileUpdatedEvent) {
    // Update all collections created by this user
    await this.collectionReadModelRepo.updateCreatorInfo(event.userId, {
      name: event.newDisplayName,
      avatarUrl: event.newAvatarUrl,
    });
  }
}
```

## Current Implementation Analysis

Our current approach with `ICuratorEnrichmentService` follows good DDD principles:

```typescript
// This is a good application-level service
export interface ICuratorEnrichmentService {
  enrichCurators(curatorIds: string[]): Promise<Map<string, CuratorInfo>>;
}
```

**Strengths:**

- ✅ Keeps enrichment logic out of the domain
- ✅ Single responsibility for user data enrichment
- ✅ Easy to test and mock
- ✅ Follows dependency inversion

## Recommended Improvements

### 1. Add Anti-Corruption Layer

```typescript
export class CuratorEnrichmentService implements ICuratorEnrichmentService {
  constructor(private userContextGateway: IUserContextGateway) {}

  async enrichCurators(
    curatorIds: string[],
  ): Promise<Map<string, CuratorInfo>> {
    try {
      return await this.userContextGateway.getCreatorProfiles(curatorIds);
    } catch (error) {
      // Graceful degradation - return minimal info
      const fallbackMap = new Map<string, CuratorInfo>();
      curatorIds.forEach((id) => {
        fallbackMap.set(id, { id, name: 'Unknown User' });
      });
      return fallbackMap;
    }
  }
}
```

### 2. Add Caching for Performance

```typescript
export class CachedCuratorEnrichmentService implements ICuratorEnrichmentService {
  constructor(
    private userContextGateway: IUserContextGateway,
    private cache: ICache,
  ) {}

  async enrichCurators(
    curatorIds: string[],
  ): Promise<Map<string, CuratorInfo>> {
    const cached = await this.cache.getMany(curatorIds);
    const uncachedIds = curatorIds.filter((id) => !cached.has(id));

    if (uncachedIds.length > 0) {
      const fresh =
        await this.userContextGateway.getCreatorProfiles(uncachedIds);
      await this.cache.setMany(fresh, { ttl: 300 }); // 5 min cache

      // Merge cached and fresh data
      fresh.forEach((value, key) => cached.set(key, value));
    }

    return cached;
  }
}
```

### 3. Move to Application Service (Optional)

If you want to keep the use case purely focused on the core domain:

```typescript
export class CollectionQueryApplicationService {
  constructor(
    private getMyCollectionsUseCase: GetMyCollectionsUseCase,
    private curatorEnrichmentService: ICuratorEnrichmentService,
  ) {}

  async getMyCollectionsWithProfiles(query: GetMyCollectionsQuery) {
    // Execute core use case (returns minimal curator data)
    const result = await this.getMyCollectionsUseCase.execute(query);

    if (result.isErr()) return result;

    // Enrich at application service level
    const curatorIds = result.value.collections.map((c) => c.authorId);
    const enrichedCurators =
      await this.curatorEnrichmentService.enrichCurators(curatorIds);

    // Transform to enriched DTOs
    const enrichedCollections = result.value.collections.map((collection) => ({
      ...collection,
      createdBy: enrichedCurators.get(collection.authorId) || {
        id: collection.authorId,
        name: 'Unknown User',
      },
    }));

    return ok({
      ...result.value,
      collections: enrichedCollections,
    });
  }
}
```

## Best Practices

1. **Separate Concerns**: Keep domain logic separate from external data enrichment
2. **Graceful Degradation**: Always have fallbacks when external services fail
3. **Performance**: Consider caching for frequently accessed user data
4. **Anti-Corruption**: Protect your domain from external service changes
5. **Testability**: Make enrichment services easy to mock and test
6. **Consistency**: Use the same enrichment patterns across your application

## When to Use Each Pattern

- **Application Service Orchestration**: Most common case, good default choice
- **Domain Service**: When enrichment is core business logic
- **Anti-Corruption Layer**: When external services are unstable or have different models
- **Event-Driven**: When you need high performance and can tolerate eventual consistency

Our current implementation is solid and follows DDD principles well. The main opportunities for improvement are adding resilience (graceful degradation) and performance optimizations (caching).
