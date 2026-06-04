# API Client Type Unification Plan

## Overview

This document outlines the plan to unify API client response types for `User`, `UrlCard`, and `Collection` to enable shared UI components across different API endpoints.

### Goals

- Unify duplicate type definitions into single, consistent interfaces
- Enable UI component reuse across different endpoints
- Minimize changes to backend (repositories and use cases)
- Enrich data in use cases where needed (e.g., fetching author profiles)

---

## Current State Analysis

### User Types - Multiple Variations

Currently, we have several user type definitions scattered across response types:

1. **`LibraryUser`** (responses.ts:96-101)

   ```tsx
   {
     (id, name, handle, avatarUrl);
   }
   ```

2. **`UserProfile`** (responses.ts:109-115)

   ```tsx
   {
     (id, name, handle, description, avatarUrl);
   }
   ```

3. **`FeedActivityActor`** (responses.ts:259-264)

   ```tsx
   {
     (id, name, handle, avatarUrl);
   }
   ```

4. **Inline author objects** in various responses with similar fields

### UrlCard Types - Multiple Variations

1. **`UrlCardView`** (responses.ts:61-92)
   - Has `collections` and `libraries` arrays
   - **Missing `author` field**

2. **`UrlCardListItem`** (responses.ts:119-144)
   - Has `collections` array
   - **Missing `author` field**

3. **`CollectionPageUrlCard`** (responses.ts:175-195)
   - Minimal version without collections
   - **Missing `author` field**

4. **`FeedActivityCard`** (responses.ts:266-297)
   - Has `collections` and `libraries` arrays
   - **Missing `author` field**

**Critical Issue**: All UrlCard types are missing the `author` field!

### Collection Types - Multiple Variations

1. **In `GetCollectionPageResponse`** (responses.ts:197-211)
   - Has `author: { id, name, handle, avatarUrl }`
   - Missing `cardCount`, `createdAt`, `updatedAt`

2. **In `GetCollectionsResponse.collections`** (responses.ts:214-228)
   - Has `createdBy` (not `author`)
   - Has `cardCount`, `createdAt`, `updatedAt`

3. **In `UrlCardView.collections`** (responses.ts:81-85)
   - Minimal: `{ id, name, authorId }`

4. **In `FeedItem.collections`** (responses.ts:304-309)
   - `{ id, name, authorHandle, uri }`

5. **In `GetUrlStatusForMyLibraryResponse`** (responses.ts:323-328)
   - `{ id, uri, name, description }`

6. **In `GetCollectionsForUrlResponse.collections`** (responses.ts:360-374)
   - Has `author: { id, name, handle, avatarUrl }`
   - Missing `cardCount`, `createdAt`, `updatedAt`

**Inconsistencies**:

- Sometimes `author`, sometimes `createdBy`, sometimes `authorId`, sometimes `authorHandle`
- Inconsistent inclusion of `cardCount`, `createdAt`, `updatedAt`

### GetLibrariesForUrlResponse - Missing Card Data

**Current Structure** (responses.ts:331-340):

```tsx
{
  libraries: {
    userId: string;
    name: string;
    handle: string;
    avatarUrl?: string;
  }[];
  // ...
}
```

**Issue**: When showing "who has this URL in their library", we only show user info but not their specific card. This means we can't display:

- The user's note on the URL
- When they saved it
- Their specific card metadata

**Proposed Enhancement**: Return both user and card data to enable richer UI display.

---

## Proposed Changes to Response Types

### 1. Unified User Interface

**File**: `src/webapp/api-client/types/responses.ts`

```tsx
// Replace LibraryUser, UserProfile, and FeedActivityActor with:
export interface User {
  id: string;
  name: string;
  handle: string;
  avatarUrl?: string;
  description?: string;
}
```

**Changes Required**:

- Remove `LibraryUser` interface (lines 96-101)
- Remove `UserProfile` interface (lines 109-115)
- Remove `FeedActivityActor` interface (lines 259-264)
- Replace all inline user objects with `User` type

### 2. Unified UrlCard Interface

**File**: `src/webapp/api-client/types/responses.ts`

```tsx
// Base UrlCard interface - used in all contexts
export interface UrlCard {
  id: string;
  type: 'URL';
  url: string;
  cardContent: {
    url: string;
    title?: string;
    description?: string;
    author?: string;
    thumbnailUrl?: string;
  };
  libraryCount: number;
  urlLibraryCount: number;
  urlInLibrary?: boolean;
  createdAt: string;
  updatedAt: string;
  author: User; // NEW - currently missing!
  note?: {
    id: string;
    text: string;
  };
}
```

**Changes Required**:

- Remove `UrlCardView` interface (lines 61-92)
- Remove `UrlCardListItem` interface (lines 119-144)
- Remove `CollectionPageUrlCard` interface (lines 175-195)
- Remove `FeedActivityCard` interface (lines 266-297)
- Update all response types to use `UrlCard`

**Context-Specific Variations**:

```tsx
// For responses that include collections
export interface UrlCardWithCollections extends UrlCard {
  collections: Collection[];
}

// For responses that include libraries
export interface UrlCardWithLibraries extends UrlCard {
  libraries: User[];
}

// For responses that include both
export interface UrlCardWithCollectionsAndLibraries extends UrlCard {
  collections: Collection[];
  libraries: User[];
}
```

### 3. Unified Collection Interface

**File**: `src/webapp/api-client/types/responses.ts`

```tsx
export interface Collection {
  id: string;
  uri?: string;
  name: string;
  author: User; // Standardize to 'author', not 'createdBy'
  description?: string;
  cardCount: number;
  createdAt: string;
  updatedAt: string;
}
```

**Changes Required**:

- Standardize all collection representations to use this interface
- Change `createdBy` to `author` in `GetCollectionsResponse`
- Add missing fields (`cardCount`, `createdAt`, `updatedAt`) where needed

### 4. Updated Response Types

#### GetUrlCardViewResponse

```tsx
export interface GetUrlCardViewResponse extends UrlCardWithCollectionsAndLibraries {}
```

#### GetUrlCardsResponse

```tsx
export interface GetUrlCardsResponse {
  cards: UrlCardWithCollections[]; // Changed from UrlCardListItem[]
  pagination: Pagination;
  sorting: CardSorting;
}
```

#### GetCollectionPageResponse

```tsx
export interface GetCollectionPageResponse {
  id: string;
  uri?: string;
  name: string;
  description?: string;
  author: User;
  urlCards: UrlCard[]; // Changed from CollectionPageUrlCard[], now includes author
  cardCount: number; // NEW
  createdAt: string; // NEW
  updatedAt: string; // NEW
  pagination: Pagination;
  sorting: CardSorting;
}
```

#### GetCollectionsResponse

```tsx
export interface GetCollectionsResponse {
  collections: Collection[]; // Uses unified Collection interface
  pagination: Pagination;
  sorting: CollectionSorting;
}
```

#### GetCollectionsForUrlResponse

```tsx
export interface GetCollectionsForUrlResponse {
  collections: Collection[]; // Uses unified Collection interface
  pagination: Pagination;
  sorting: CollectionSorting;
}
```

#### GetLibrariesForCardResponse

```tsx
export interface GetLibrariesForCardResponse {
  cardId: string;
  users: User[]; // Changed from LibraryUser[]
  totalCount: number;
}
```

#### GetLibrariesForUrlResponse

```tsx
export interface GetLibrariesForUrlResponse {
  libraries: {
    user: User; // The user who has this URL in their library
    card: UrlCard; // Their specific card (may include a note)
  }[];
  pagination: Pagination;
  sorting: CardSorting;
}
```

#### GetNoteCardsForUrlResponse

```tsx
export interface GetNoteCardsForUrlResponse {
  notes: {
    id: string;
    note: string;
    author: User; // Changed to use unified User interface
    createdAt: string;
    updatedAt: string;
  }[];
  pagination: Pagination;
  sorting: CardSorting;
}
```

#### GetProfileResponse

```tsx
export interface GetProfileResponse extends User {}
```

#### GetUrlStatusForMyLibraryResponse

```tsx
export interface GetUrlStatusForMyLibraryResponse {
  cardId?: string;
  collections?: Collection[]; // Uses unified Collection interface
}
```

#### FeedItem

```tsx
export interface FeedItem {
  id: string;
  user: User; // Changed from FeedActivityActor
  card: UrlCard; // Changed from FeedActivityCard, now includes author
  createdAt: Date;
  collections: Collection[]; // Changed to use unified Collection
}
```

---

## Repository Changes

### 1. ICardQueryRepository

**File**: `src/modules/cards/domain/ICardQueryRepository.ts`

#### Add authorId to UrlCardView

```tsx
export interface UrlCardView {
  id: string;
  type: CardTypeEnum.URL;
  url: string;
  cardContent: {
    url: string;
    title?: string;
    description?: string;
    author?: string;
    thumbnailUrl?: string;
  };
  libraryCount: number;
  urlLibraryCount: number;
  urlInLibrary?: boolean;
  createdAt: Date;
  updatedAt: Date;
  authorId: string; // NEW - needed to enrich with author profile
  note?: {
    id: string;
    text: string;
  };
}
```

#### Update LibraryForUrlDTO

```tsx
// Repository returns card data - will be enriched with user profile in use case
export interface LibraryForUrlDTO {
  userId: string;
  card: {
    id: string;
    url: string;
    cardContent: {
      url: string;
      title?: string;
      description?: string;
      author?: string;
      thumbnailUrl?: string;
    };
    libraryCount: number;
    urlLibraryCount: number;
    urlInLibrary?: boolean;
    createdAt: Date;
    updatedAt: Date;
    note?: {
      id: string;
      text: string;
    };
  };
  // Note: userId is the card author in this context (it's their card in their library)
}
```

**Implementation Impact**:

- Update SQL queries in `DrizzleCardQueryRepository` to include `cards.curatorId as authorId` in all `UrlCardView` queries
- Update `getLibrariesForUrl` query to return full card data (similar to how `getUrlCardsOfUser` works)
  - No need to join with profiles table - enrichment happens in use case (following the pattern from `GetCollectionsForUrlUseCase`)

### 2. ICollectionQueryRepository

**File**: `src/modules/cards/domain/ICollectionQueryRepository.ts`

No changes needed - already returns `authorId` which is enriched in use cases.

---

## Use Case Changes

### 1. GetUrlCardViewUseCase

**File**: `src/modules/cards/application/useCases/queries/GetUrlCardViewUseCase.ts`

**Changes**:

- Fetch author profile for the card using `cardView.authorId`
- Transform `libraries` to include full user profiles (already done)
- Transform `collections` to include full Collection objects (new)

**New Code**:

```tsx
// After fetching cardView, fetch the card author
const cardAuthorResult = await this.profileService.getProfile(
  cardView.authorId,
  query.callingUserId,
);

if (cardAuthorResult.isErr()) {
  return err(
    new Error(`Failed to fetch card author: ${cardAuthorResult.error.message}`),
  );
}

const cardAuthor = cardAuthorResult.value;

// Enrich collections with full Collection data
const collectionIds = cardView.collections.map((c) => c.id);
const enrichedCollections: Collection[] = await Promise.all(
  collectionIds.map(async (id) => {
    const collectionResult = await this.collectionRepo.findById(
      CollectionId.createFromString(id).value,
    );
    // ... fetch collection and author, build Collection object
  }),
);

const result: UrlCardViewResult = {
  ...cardView,
  author: {
    id: cardAuthor.id,
    name: cardAuthor.name,
    handle: cardAuthor.handle,
    avatarUrl: cardAuthor.avatarUrl,
    description: cardAuthor.bio,
  },
  collections: enrichedCollections,
  libraries: enrichedLibraries,
};
```

**Dependencies**:

- Needs `ICollectionRepository` injected
- Repository must return `authorId` on `UrlCardView`

### 2. GetUrlCardsUseCase

**File**: `src/modules/cards/application/useCases/queries/GetUrlCardsUseCase.ts`

**Changes**:

- Fetch author profiles for all cards
- Transform `collections` for each card to full Collection objects

**New Code**:

```tsx
// After fetching cards from repository
const uniqueAuthorIds = Array.from(
  new Set(result.items.map((card) => card.authorId)),
);

const authorProfiles = new Map<string, User>();
const profileResults = await Promise.all(
  uniqueAuthorIds.map((id) =>
    this.profileService.getProfile(id, query.callingUserId),
  ),
);

// Build author map...

// Enrich cards with author data
const enrichedCards = result.items.map((card) => {
  const author = authorProfiles.get(card.authorId);
  // ... also enrich collections
  return {
    ...card,
    author,
    collections: enrichedCollections,
  };
});
```

**Dependencies**:

- Needs `IProfileService` injected
- Needs `ICollectionRepository` injected for collection enrichment
- Repository must return `authorId` on cards

### 3. GetCollectionPageUseCase

**File**: `src/modules/cards/application/useCases/queries/GetCollectionPageUseCase.ts`

**Changes**:

- Enrich URL cards with author profiles
- Add `cardCount`, `createdAt`, `updatedAt` to response

**New Code**:

```tsx
// After fetching cards in collection
const uniqueAuthorIds = Array.from(
  new Set(enrichedCards.map(card => card.authorId))
);

const authorProfiles = new Map<string, User>();
// ... fetch profiles

const cardsWithAuthors = enrichedCards.map(card => ({
  ...card,
  author: authorProfiles.get(card.authorId),
}));

return ok({
  id: collection.collectionId.getStringValue(),
  uri: collectionUri,
  name: collection.name.value,
  description: collection.description?.value,
  author: { ... },
  urlCards: cardsWithAuthors,
  cardCount: cardsResult.totalCount,  // NEW
  createdAt: collection.createdAt.toISOString(),  // NEW
  updatedAt: collection.updatedAt.toISOString(),  // NEW
  pagination: { ... },
  sorting: { ... },
});
```

**Dependencies**:

- Already has `IProfileService`
- Repository must return `authorId` on cards

### 4. GetCollectionsUseCase

**File**: `src/modules/cards/application/useCases/queries/GetCollectionsUseCase.ts`

**Changes**:

- Change `createdBy` to `author` in DTO mapping
- Ensure `cardCount`, `createdAt`, `updatedAt` are included (already present)
- Add `description` field to author

**Updated Code**:

```tsx
const enrichedCollections: CollectionListItemDTO[] = result.items.map(
  (item) => {
    return {
      id: item.id,
      uri: item.uri,
      name: item.name,
      description: item.description,
      updatedAt: item.updatedAt,
      createdAt: item.createdAt,
      cardCount: item.cardCount,
      author: {
        // Changed from 'createdBy'
        id: profile.id,
        name: profile.name,
        handle: profile.handle,
        avatarUrl: profile.avatarUrl,
        description: profile.bio, // NEW
      },
    };
  },
);
```

**Dependencies**: None (already has what it needs)

### 5. GetCollectionsForUrlUseCase

**File**: `src/modules/cards/application/useCases/queries/GetCollectionsForUrlUseCase.ts`

**Changes**:

- Add `cardCount`, `createdAt`, `updatedAt` to collection DTOs
- Add `description` to author

**Updated Code**:

```tsx
// Need to fetch full collection objects to get cardCount, dates
const enrichedCollections: CollectionForUrlDTO[] = await Promise.all(
  result.items.map(async (item) => {
    const author = profileMap.get(item.authorId);
    if (!author) {
      throw new Error(`Profile not found for author ${item.authorId}`);
    }

    // Fetch full collection to get cardCount, dates
    const collectionResult = await this.collectionRepo.findById(
      CollectionId.createFromString(item.id).value,
    );
    const collection = collectionResult.value;

    return {
      id: item.id,
      uri: item.uri,
      name: item.name,
      description: item.description,
      author: {
        ...author,
        description: profileMap.get(item.authorId)?.description,
      },
      cardCount: collection.cardCount, // NEW
      createdAt: collection.createdAt.toISOString(), // NEW
      updatedAt: collection.updatedAt.toISOString(), // NEW
    };
  }),
);
```

**Dependencies**:

- Needs `ICollectionRepository` injected

### 6. GetLibrariesForUrlUseCase

**File**: `src/modules/cards/application/useCases/queries/GetLibrariesForUrlUseCase.ts`

**Changes**:

- Repository now returns full card data in `LibraryForUrlDTO`
- Enrich with user profiles for each library owner
- Transform to return both `user` and `card` objects

**Updated Code** (following pattern from `GetCollectionsForUrlUseCase`):

```tsx
async execute(
  query: GetLibrariesForUrlQuery,
): Promise<Result<GetLibrariesForUrlResult>> {
  // Validate URL
  const urlResult = URL.create(query.url);
  if (urlResult.isErr()) {
    return err(
      new ValidationError(`Invalid URL: ${urlResult.error.message}`),
    );
  }

  // Set defaults
  const page = query.page || 1;
  const limit = Math.min(query.limit || 20, 100);
  const sortBy = query.sortBy || CardSortField.UPDATED_AT;
  const sortOrder = query.sortOrder || SortOrder.DESC;

  try {
    // Execute query to get libraries with full card data
    const result = await this.cardQueryRepo.getLibrariesForUrl(query.url, {
      page,
      limit,
      sortBy,
      sortOrder,
    });

    // Enrich with user profiles
    const uniqueUserIds = Array.from(
      new Set(result.items.map((item) => item.userId)),
    );

    const profilePromises = uniqueUserIds.map((userId) =>
      this.profileService.getProfile(userId, query.callingUserId),
    );

    const profileResults = await Promise.all(profilePromises);

    // Create a map of profiles
    const profileMap = new Map<string, User>();

    for (let i = 0; i < uniqueUserIds.length; i++) {
      const profileResult = profileResults[i];
      const userId = uniqueUserIds[i];
      if (!profileResult || !userId) {
        return err(new Error('Missing profile result or user ID'));
      }
      if (profileResult.isErr()) {
        return err(
          new Error(
            `Failed to fetch user profile: ${profileResult.error instanceof Error ? profileResult.error.message : 'Unknown error'}`,
          ),
        );
      }
      const profile = profileResult.value;
      profileMap.set(userId, {
        id: profile.id,
        name: profile.name,
        handle: profile.handle,
        avatarUrl: profile.avatarUrl,
        description: profile.bio,
      });
    }

    // Map items with enriched user data and card data
    const enrichedLibraries = result.items.map((item) => {
      const user = profileMap.get(item.userId);
      if (!user) {
        throw new Error(`Profile not found for user ${item.userId}`);
      }

      // Build card object
      // Note: userId is the card author (it's their card in their library)
      const card: UrlCard = {
        id: item.card.id,
        type: 'URL',
        url: item.card.url,
        cardContent: item.card.cardContent,
        libraryCount: item.card.libraryCount,
        urlLibraryCount: item.card.urlLibraryCount,
        urlInLibrary: item.card.urlInLibrary,
        createdAt: item.card.createdAt.toISOString(),
        updatedAt: item.card.updatedAt.toISOString(),
        author: user, // Card author is same as library user
        note: item.card.note,
      };

      return {
        user,
        card,
      };
    });

    return ok({
      libraries: enrichedLibraries,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(result.totalCount / limit),
        totalCount: result.totalCount,
        hasMore: page * limit < result.totalCount,
        limit,
      },
      sorting: {
        sortBy,
        sortOrder,
      },
    });
  } catch (error) {
    return err(
      new Error(
        `Failed to retrieve libraries for URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ),
    );
  }
}
```

**Dependencies**:

- Needs `IProfileService` injected (add if not already present)
- Repository must return full card data in `LibraryForUrlDTO`

### 7. GetNoteCardsForUrlUseCase

**File**: `src/modules/cards/application/useCases/queries/GetNoteCardsForUrlUseCase.ts`

**Changes**:

- Add `description` field to enriched author objects

**Updated Code**:

```tsx
profileMap.set(authorId, {
  id: profile.id,
  name: profile.name,
  handle: profile.handle,
  avatarUrl: profile.avatarUrl,
  description: profile.bio, // NEW
});
```

**Dependencies**: None (already enriches authors)

### 8. GetLibrariesForCardUseCase

**File**: `src/modules/cards/application/useCases/queries/GetLibrariesForCardUseCase.ts`

**Changes**:

- Add `description` field to user DTOs

**Updated Code**:

```tsx
users.push({
  id: profile.id,
  name: profile.name,
  handle: profile.handle,
  avatarUrl: profile.avatarUrl,
  description: profile.bio, // NEW
});
```

**Dependencies**: None (already enriches user profiles)

### 9. GetProfileUseCase

**File**: `src/modules/cards/application/useCases/queries/GetProfileUseCase.ts`

**Changes**: None (already maps `bio` to `description`)

### 10. GetUrlStatusForMyLibraryUseCase

**File**: `src/modules/cards/application/useCases/queries/GetUrlStatusForMyLibraryUseCase.ts`

**Changes**:

- Enrich collections with full Collection objects (add `author`, `cardCount`, `createdAt`, `updatedAt`)

**New Code**:

```tsx
// Instead of just mapping simple collection info
result.collections = await Promise.all(
  collections.map(async (collection) => {
    // Fetch full collection to get dates and cardCount
    const collectionResult = await this.collectionRepo.findById(
      CollectionId.createFromString(collection.id).value,
    );
    const fullCollection = collectionResult.value;

    // Fetch author profile
    const authorProfile = await this.profileService.getProfile(
      fullCollection.authorId.value,
    );

    return {
      id: collection.id,
      uri: collection.uri,
      name: collection.name,
      description: collection.description,
      author: {
        id: authorProfile.id,
        name: authorProfile.name,
        handle: authorProfile.handle,
        avatarUrl: authorProfile.avatarUrl,
        description: authorProfile.bio,
      },
      cardCount: fullCollection.cardCount,
      createdAt: fullCollection.createdAt.toISOString(),
      updatedAt: fullCollection.updatedAt.toISOString(),
    };
  }),
);
```

**Dependencies**:

- Needs `ICollectionRepository` injected
- Needs `IProfileService` injected

### 11. GetGlobalFeedUseCase

**File**: `src/modules/feeds/application/useCases/queries/GetGlobalFeedUseCase.ts`

**Changes**:

- Add author to card data
- Enrich collections with full Collection objects
- Use unified `User` type for actors

**New Code**:

```tsx
// After hydrating card data, also fetch card authors
const uniqueCardAuthorIds = Array.from(
  new Set(Array.from(cardDataMap.values()).map((card) => card.authorId)),
);

const cardAuthorProfiles = new Map<string, User>();
// ... fetch card authors

// Update cardDataMap to include authors
const cardsWithAuthors = new Map(
  Array.from(cardDataMap.entries()).map(([id, card]) => [
    id,
    {
      ...card,
      author: cardAuthorProfiles.get(card.authorId),
    },
  ]),
);

// When enriching collections, build full Collection objects
const enrichedCollections = new Map<string, Collection>();
// ... fetch collections with full data (author, cardCount, dates)

// Use enriched data in feed items
feedItems.push({
  id: activity.activityId.getStringValue(),
  user: actor, // Already using unified User type
  card: {
    ...cardData,
    author: cardAuthorProfiles.get(cardData.authorId),
  },
  createdAt: activity.createdAt,
  collections: collectionsForCard,
});
```

**Dependencies**:

- Repository must return `authorId` on cards
- Already has access to profile and collection services

---

## Implementation Steps

### Phase 1: Repository Updates

1. Update `UrlCardView` in `ICardQueryRepository.ts` to include `authorId`
2. Update `LibraryForUrlDTO` in `ICardQueryRepository.ts` to include full card data (url, cardContent, libraryCount, etc.)
3. Update `DrizzleCardQueryRepository` to:
   - Include `cards.curatorId as authorId` in all queries returning `UrlCardView`
   - Update `getLibrariesForUrl` query to return full card data (similar to `getUrlCardsOfUser`)

### Phase 2: Response Type Updates

1. Add unified `User` interface in `responses.ts`
2. Add unified `UrlCard` interface with `author: User` field
3. Add context-specific variations (`UrlCardWithCollections`, etc.)
4. Add unified `Collection` interface with `author: User` field
5. Update all response interfaces to use the new unified types
6. Remove deprecated types (`LibraryUser`, `UserProfile`, `FeedActivityActor`, etc.)

### Phase 3: Use Case Updates (in order of dependency)

1. **GetProfileUseCase** - Add `description` field (minimal change)
2. **GetLibrariesForCardUseCase** - Add `description` to user DTOs
3. **GetNoteCardsForUrlUseCase** - Add `description` to author
4. **GetLibrariesForUrlUseCase** - Enrich with user profiles, return `{ user, card }[]` instead of just users
5. **GetCollectionsUseCase** - Change `createdBy` to `author`, add `description`
6. **GetCollectionsForUrlUseCase** - Add collection dates/cardCount, author description
7. **GetUrlStatusForMyLibraryUseCase** - Enrich collections with full data
8. **GetUrlCardViewUseCase** - Add card author, enrich collections
9. **GetUrlCardsUseCase** - Add card authors, enrich collections
10. **GetCollectionPageUseCase** - Add card authors, add collection dates/cardCount
11. **GetGlobalFeedUseCase** - Add card authors, enrich collections

### Phase 4: API Client Updates

1. Update type imports in `ApiClient.ts`
2. Update client method signatures to use new response types
3. Verify all endpoints return the expected unified types

### Phase 5: Frontend Updates (Out of Scope)

- Update UI components to consume unified types
- Remove any frontend-specific type transformations
- Ensure components work with all endpoints

---

## Testing Strategy

### Unit Tests

- Test each use case with new response structure
- Verify author enrichment for cards
- Verify collection enrichment with full data
- Test error handling when profile/collection fetches fail

### Integration Tests

- Test API endpoints return correctly shaped data
- Verify all fields are present in responses
- Test that shared UI components work with data from different endpoints

### Manual Testing

- Test each page/view that displays users, cards, and collections
- Verify no regressions in existing functionality
- Verify new author field displays correctly on cards

---

## Migration Notes

### Breaking Changes

- All response types have changed
- Frontend code consuming these types will need updates
- Any DTOs imported from responses.ts will need to be updated

### Backwards Compatibility

- No backwards compatibility at API client level
- This is a one-time migration
- Coordinate with frontend team for deployment

---

## Questions & Clarifications

1. **UrlCard.collections field**: Should this be `Collection[]` (full objects) or remain minimal `{id, name, authorId}[]`?
   - **Recommendation**: Use minimal for collections array on cards to avoid circular bloat. Only enrich when specifically needed (like in `UrlCardWithCollections`).

2. **Performance**: Enriching authors for all cards in list views will add N+1 queries.
   - **Mitigation**: Batch profile fetches with `Promise.all`, cache frequently accessed profiles, or update repository to join with profiles table.

3. **LibrariesForUrl**: Return both user and card data in response
   - **Decision**: Response now returns `{ user: User, card: UrlCard }[]` to show both who saved the URL and their specific card (with potential note)
   - **Implementation**: Repository returns full card data, use case enriches with user profiles (following pattern from `GetCollectionsForUrlUseCase`)

4. **Collection enrichment**: When displaying collections in UrlCard, do we need full Collection objects?
   - **Current approach**: Keep minimal `{id, name, authorId}[]` to avoid over-fetching
   - **Alternative**: Enrich when needed in specific responses (e.g., `GetUrlCardViewResponse`)

---

## Summary

This plan unifies 3 core types (`User`, `UrlCard`, `Collection`) across all API client responses. The main changes are:

1. **User**: Single interface with optional `description`
2. **UrlCard**: Add `author` field (currently missing!)
3. **Collection**: Standardize to `author` (not `createdBy`), ensure complete data
4. **GetLibrariesForUrl**: Enhanced to return both `user` and `card` objects, enabling display of who saved a URL and their specific card (with potential note)

Most changes are in the API client response types and use cases. Repository changes are minimal (add `authorId` to card queries, expand `getLibrariesForUrl` to return full card data). Use cases will enrich data by fetching author profiles using the existing `IProfileService`.
