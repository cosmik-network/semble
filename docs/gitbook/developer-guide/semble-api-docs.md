---
description: >-
  A full-featured API with authentication is under-construction. What is
  documented below are our existing public endpoints and how to use them. The
  full-featured API will succeed these endpoints.
---

# Semble API docs

## Semble Public API Documentation

### Overview

The Semble API provides access to our AppView, providing endpoints for search and aggregation. This documentation covers all publicly accessible endpoints.

**Base URL:** `https://api.semble.so`

***

### Table of Contents

1. User Profiles
2. Content Discovery
3. Cards & URLs
4. Collections
5. Search
6. Common Types
7. Error Responses

***

### User Profiles

#### Get User Profile

Retrieve public profile information for a user by their handle or DID.

**Endpoint:** `GET /api/users/:identifier`

**Parameters:**

* `identifier` (path) - User's handle (e.g., `alice.bsky.social`) or DID (e.g., `did:plc:xyz...`)

**Response:** `GetProfileResponse`

```typescript
interface GetProfileResponse extends User {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
  description?: string;
}
```

**Example Request:**

```bash
GET /api/users/alice.bsky.social
```

**Example Response:**

```json
{
  "did": "did:plc:abc123xyz",
  "handle": "alice.bsky.social",
  "displayName": "Alice",
  "avatar": "https://cdn.bsky.app/img/avatar/plain/did:plc:abc123xyz/...",
  "description": "Content curator and researcher"
}
```

***

### Content Discovery

#### Get Global Feed

Retrieve the global activity feed showing recent content additions across all users.

**Endpoint:** `GET /api/feeds/global`

**Query Parameters:**

* `page` (optional, number) - Page number for pagination (default: 1)
* `limit` (optional, number) - Items per page (default: 20)
* `beforeActivityId` (optional, string) - Cursor for pagination
* `urlType` (optional, UrlType) - Filter by URL type (article, link, book, research, audio, video, social, event, software)
* `source` (optional, ActivitySource) - Filter by source (margin, semble)

**Response:** `GetGlobalFeedResponse`

```typescript
interface GetGlobalFeedResponse {
  activities: FeedItem[];
  pagination: FeedPagination;
}

interface FeedItem {
  id: string;
  user: User;
  card: UrlCard;
  createdAt: Date;
  collections: Collection[];
}
```

**Example Request:**

```bash
GET /api/feeds/global?limit=10&urlType=article
```

**Example Response:**

```json
{
  "activities": [
    {
      "id": "uuid-1",
      "user": {
        "did": "did:plc:abc123",
        "handle": "alice.bsky.social",
        "displayName": "Alice"
      },
      "card": {
        "id": "card-uuid-1",
        "type": "URL",
        "url": "https://example.com/article",
        "cardContent": {
          "url": "https://example.com/article",
          "title": "Interesting Article",
          "description": "A fascinating read..."
        },
        "libraryCount": 1,
        "urlLibraryCount": 5,
        "createdAt": "2024-01-15T10:30:00Z",
        "updatedAt": "2024-01-15T10:30:00Z",
        "author": {
          "did": "did:plc:abc123",
          "handle": "alice.bsky.social",
          "displayName": "Alice"
        }
      },
      "createdAt": "2024-01-15T10:30:00Z",
      "collections": []
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 150,
    "hasMore": true,
    "beforeId": "uuid-10"
  }
}
```

### Cards & URLs

Cards represent saved content in Semble. URL cards link to external content with metadata.

#### Get User's URL Cards

Retrieve all URL cards saved by a specific user.

**Endpoint:** `GET /api/cards/user/:identifier`

**Parameters:**

* `identifier` (path) - User's handle or DID

**Query Parameters:**

* `page` (optional, number) - Page number
* `limit` (optional, number) - Items per page
* `sortBy` (optional, string) - Sort field (default: createdAt)
* `sortOrder` (optional, 'asc' | 'desc') - Sort direction (default: desc)
* `urlType` (optional, UrlType) - Filter by URL type

**Response:** `GetUrlCardsResponse`

```typescript
interface GetUrlCardsResponse {
  cards: UrlCard[];
  pagination: Pagination;
  sorting: CardSorting;
}
```

**Example Request:**

```bash
GET /api/cards/user/alice.bsky.social?limit=20&urlType=article
```

**Example Response:**

```json
{
  "cards": [
    {
      "id": "card-uuid-1",
      "type": "URL",
      "url": "https://example.com/article",
      "uri": "at://did:plc:abc123/network.cosmik.card/xyz",
      "cardContent": {
        "url": "https://example.com/article",
        "title": "Interesting Article"
      },
      "libraryCount": 1,
      "urlLibraryCount": 5,
      "urlInLibrary": false,
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z",
      "author": {
        "did": "did:plc:abc123",
        "handle": "alice.bsky.social",
        "displayName": "Alice"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  },
  "sorting": {
    "sortBy": "createdAt",
    "sortOrder": "desc"
  }
}
```

#### Get Libraries for URL

Get all users who have saved a specific URL (across all cards).

**Endpoint:** `GET /api/cards/libraries/url`

**Query Parameters:**

* `url` (required, string) - The URL to query
* `page` (optional, number) - Page number
* `limit` (optional, number) - Items per page
* `sortBy` (optional, string) - Sort field
* `sortOrder` (optional, 'asc' | 'desc') - Sort direction

**Response:** `GetLibrariesForUrlResponse`

```typescript
interface GetLibrariesForUrlResponse {
  libraries: {
    user: User;
    card: UrlCard;
  }[];
  pagination: Pagination;
  sorting: CardSorting;
}
```

**Example Request:**

```bash
GET /api/cards/libraries/url?url=https://example.com/article
```

**Example Response:**

```json
{
  "libraries": [
    {
      "user": {
        "did": "did:plc:abc123",
        "handle": "alice.bsky.social",
        "displayName": "Alice"
      },
      "card": {
        "id": "card-uuid-1",
        "type": "URL",
        "url": "https://example.com/article",
        "cardContent": {
          "url": "https://example.com/article",
          "title": "Interesting Article"
        },
        "libraryCount": 3,
        "urlLibraryCount": 5,
        "createdAt": "2024-01-15T10:30:00Z",
        "updatedAt": "2024-01-15T10:30:00Z",
        "author": {
          "did": "did:plc:abc123",
          "handle": "alice.bsky.social",
          "displayName": "Alice"
        }
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1
  },
  "sorting": {
    "sortBy": "createdAt",
    "sortOrder": "desc"
  }
}
```

#### Get Note Cards for URL

Get all note cards associated with a specific URL.

**Endpoint:** `GET /api/cards/notes/url`

**Query Parameters:**

* `url` (required, string) - The URL to query
* `page` (optional, number) - Page number
* `limit` (optional, number) - Items per page
* `sortBy` (optional, string) - Sort field
* `sortOrder` (optional, 'asc' | 'desc') - Sort direction

**Response:** `GetNoteCardsForUrlResponse`

```typescript
interface GetNoteCardsForUrlResponse {
  notes: {
    id: string;
    note: string;
    author: User;
    createdAt: string;
    updatedAt: string;
  }[];
  pagination: Pagination;
  sorting: CardSorting;
}
```

**Example Request:**

```bash
GET /api/cards/notes/url?url=https://example.com/article
```

**Example Response:**

```json
{
  "notes": [
    {
      "id": "note-uuid-1",
      "note": "This article provides excellent insights into distributed systems.",
      "author": {
        "did": "did:plc:abc123",
        "handle": "alice.bsky.social",
        "displayName": "Alice"
      },
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 3,
    "totalPages": 1
  },
  "sorting": {
    "sortBy": "createdAt",
    "sortOrder": "desc"
  }
}
```

***

### Collections

Collections are curated groups of cards organized by users.

#### Search Collections

Search for collections globally by name or description.

**Endpoint:** `GET /api/collections/search`

**Query Parameters:**

* `searchText` (optional, string) - Text to search in collection names/descriptions
* `identifier` (optional, string) - Filter by author's handle or DID
* `accessType` (optional, CollectionAccessType) - Filter by access type (OPEN, CLOSED)
* `page` (optional, number) - Page number
* `limit` (optional, number) - Items per page
* `sortBy` (optional, string) - Sort field
* `sortOrder` (optional, 'asc' | 'desc') - Sort direction

**Response:** `GetCollectionsResponse`

```typescript
interface GetCollectionsResponse {
  collections: Collection[];
  pagination: Pagination;
  sorting: CollectionSorting;
}
```

**Example Request:**

```bash
GET /api/collections/search?searchText=tech&accessType=OPEN
```

**Example Response:**

```json
{
  "collections": [
    {
      "id": "collection-uuid-1",
      "uri": "at://did:plc:abc123/app.bsky.collection/xyz",
      "name": "Tech Articles 2024",
      "description": "Curated collection of the best tech articles",
      "accessType": "OPEN",
      "author": {
        "did": "did:plc:abc123",
        "handle": "alice.bsky.social",
        "displayName": "Alice"
      },
      "cardCount": 42,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 8,
    "totalPages": 1
  },
  "sorting": {
    "sortBy": "updatedAt",
    "sortOrder": "desc"
  }
}
```

#### Get Collections for URL

Get all collections that contain a specific URL.

**Endpoint:** `GET /api/collections/url`

**Query Parameters:**

* `url` (required, string) - The URL to query
* `page` (optional, number) - Page number
* `limit` (optional, number) - Items per page
* `sortBy` (optional, string) - Sort field
* `sortOrder` (optional, 'asc' | 'desc') - Sort direction

**Response:** `GetCollectionsForUrlResponse`

```typescript
interface GetCollectionsForUrlResponse {
  collections: Collection[];
  pagination: Pagination;
  sorting: CollectionSorting;
}
```

**Example Request:**

```bash
GET /api/collections/url?url=https://example.com/article
```

**Example Response:**

```json
{
  "collections": [
    {
      "id": "collection-uuid-1",
      "uri": "at://did:plc:1234/network.cosmik.collection/1234",
      "name": "Tech Articles",
      "author": {
        "did": "did:plc:abc123",
        "handle": "alice.bsky.social",
        "displayName": "Alice"
      },
      "cardCount": 42,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 3,
    "totalPages": 1
  },
  "sorting": {
    "sortBy": "updatedAt",
    "sortOrder": "desc"
  }
}
```

#### Get User's Collections

Get all collections created by a specific user.

**Endpoint:** `GET /api/collections/user/:identifier`

**Parameters:**

* `identifier` (path) - User's handle or DID

**Query Parameters:**

* `searchText` (optional, string) - Filter collections by name/description
* `page` (optional, number) - Page number
* `limit` (optional, number) - Items per page
* `sortBy` (optional, string) - Sort field
* `sortOrder` (optional, 'asc' | 'desc') - Sort direction

**Response:** `GetCollectionsResponse`

**Example Request:**

```bash
GET /api/collections/user/alice.bsky.social
```

#### Get Open Collections with Contributor

Get all open collections where a user has contributed content.

**Endpoint:** `GET /api/collections/contributed/:identifier`

**Parameters:**

* `identifier` (path) - User's handle or DID

**Query Parameters:**

* `page` (optional, number) - Page number
* `limit` (optional, number) - Items per page
* `sortBy` (optional, string) - Sort field
* `sortOrder` (optional, 'asc' | 'desc') - Sort direction

**Response:** `GetCollectionsResponse`

**Example Request:**

```bash
GET /api/collections/contributed/alice.bsky.social
```

#### Get Collection by AT URI

Get a collection by its AT Protocol URI components.

**Endpoint:** `GET /api/collections/at/:handle/:recordKey`

**Parameters:**

* `handle` (path) - User's handle (e.g., `alice.bsky.social`)
* `recordKey` (path) - Record key (the last part of the AT URI)

**Query Parameters:**

* `page` (optional, number) - Page number for cards in collection
* `limit` (optional, number) - Items per page
* `sortBy` (optional, string) - Sort field
* `sortOrder` (optional, 'asc' | 'desc') - Sort direction
* `urlType` (optional, UrlType) - Filter cards by URL type

**Response:** `GetCollectionPageResponse`

```typescript
interface GetCollectionPageResponse {
  id: string;
  uri?: string;
  name: string;
  description?: string;
  accessType?: CollectionAccessType;
  author: User;
  urlCards: UrlCard[];
  cardCount: number;
  createdAt: string;
  updatedAt: string;
  pagination: Pagination;
  sorting: CardSorting;
}
```

**Example Request:**

```bash
GET /api/collections/at/alice.bsky.social/3kxyz123?limit=20
```

**Example Response:**

```json
{
  "id": "collection-uuid-1",
  "uri": "at://did:plc:abc123/network.cosmik.collection/3kxyz123",
  "name": "Tech Articles 2024",
  "description": "Curated collection of the best tech articles",
  "accessType": "OPEN",
  "author": {
    "did": "did:plc:abc123",
    "handle": "alice.bsky.social",
    "displayName": "Alice"
  },
  "urlCards": [
    {
      "id": "card-uuid-1",
      "type": "URL",
      "url": "https://example.com/article",
      "cardContent": {
        "url": "https://example.com/article",
        "title": "Interesting Article"
      },
      "libraryCount": 3,
      "urlLibraryCount": 5,
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z",
      "author": {
        "did": "did:plc:abc123",
        "handle": "alice.bsky.social",
        "displayName": "Alice"
      }
    }
  ],
  "cardCount": 42,
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-15T10:30:00Z",
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "totalPages": 3
  },
  "sorting": {
    "sortBy": "createdAt",
    "sortOrder": "desc"
  }
}
```

#### Get Collection Page

Get detailed information about a collection including all its cards.

**Endpoint:** `GET /api/collections/:collectionId`

**Parameters:**

* `collectionId` (path) - The collection's UUID

**Query Parameters:**

* `page` (optional, number) - Page number for cards
* `limit` (optional, number) - Items per page
* `sortBy` (optional, string) - Sort field
* `sortOrder` (optional, 'asc' | 'desc') - Sort direction
* `urlType` (optional, UrlType) - Filter cards by URL type

**Response:** `GetCollectionPageResponse`

**Example Request:**

```bash
GET /api/collections/550e8400-e29b-41d4-a716-446655440000?limit=20
```

***

### Search

#### Get Similar URLs

Find URLs similar to a given URL based on content similarity.

**Endpoint:** `GET /api/search/similar-urls`

**Query Parameters:**

* `url` (required, string) - The reference URL
* `threshold` (optional, number) - Similarity threshold (0-1)
* `urlType` (optional, string) - Filter by URL type
* `page` (optional, number) - Page number
* `limit` (optional, number) - Items per page
* `sortBy` (optional, string) - Sort field
* `sortOrder` (optional, 'asc' | 'desc') - Sort direction

**Response:** `GetSimilarUrlsForUrlResponse`

```typescript
interface GetSimilarUrlsForUrlResponse {
  urls: UrlView[];
  pagination: Pagination;
}

interface UrlView {
  url: string;
  metadata: UrlMetadata;
  urlLibraryCount: number;
  urlInLibrary?: boolean;
}
```

**Example Request:**

```bash
GET /api/search/similar-urls?url=https://example.com/article&threshold=0.7
```

**Example Response:**

```json
{
  "urls": [
    {
      "url": "https://another-site.com/similar-article",
      "metadata": {
        "url": "https://another-site.com/similar-article",
        "title": "Related Content",
        "description": "Similar topic discussion..."
      },
      "urlLibraryCount": 8,
      "urlInLibrary": false
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 12,
    "totalPages": 1
  }
}
```

#### Semantic Search URLs

Search for URLs using semantic/natural language queries.

**Endpoint:** `GET /api/search/semantic`

**Query Parameters:**

* `query` (required, string) - Natural language search query
* `threshold` (optional, number) - Relevance threshold (0-1)
* `urlType` (optional, string) - Filter by URL type
* `identifier` (optional, string) - Filter by author's handle or DID
* `page` (optional, number) - Page number
* `limit` (optional, number) - Items per page
* `sortBy` (optional, string) - Sort field
* `sortOrder` (optional, 'asc' | 'desc') - Sort direction

**Response:** `SemanticSearchUrlsResponse`

```typescript
interface SemanticSearchUrlsResponse {
  urls: UrlView[];
  pagination: Pagination;
}
```

**Example Request:**

```bash
GET /api/search/semantic?query=distributed+systems+architecture&limit=10
```

**Example Response:**

```json
{
  "urls": [
    {
      "url": "https://example.com/distributed-systems",
      "metadata": {
        "url": "https://example.com/distributed-systems",
        "title": "Building Distributed Systems",
        "description": "A guide to distributed architecture..."
      },
      "urlLibraryCount": 15,
      "urlInLibrary": false
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

#### Search AT Protocol Accounts

Search for AT Protocol accounts (Bluesky users).

**Endpoint:** `GET /api/search/accounts`

**Query Parameters:**

* `q` (optional, string) - Search query (Lucene syntax supported)
* `term` (optional, string) - DEPRECATED: use 'q' instead
* `limit` (optional, number) - Items to return
* `cursor` (optional, string) - Pagination cursor

**Response:** `SearchAtProtoAccountsResponse`

```typescript
interface SearchAtProtoAccountsResponse {
  cursor?: string;
  actors: ProfileView[];
}

interface ProfileView {
  did: string;
  handle: string;
  displayName?: string;
  description?: string;
  avatar?: string;
  indexedAt?: string;
  createdAt?: string;
}
```

**Example Request:**

```bash
GET /api/search/accounts?q=tech+curator&limit=20
```

**Example Response:**

```json
{
  "actors": [
    {
      "did": "did:plc:abc123",
      "handle": "techcurator.bsky.social",
      "displayName": "Tech Curator",
      "description": "Curating the best tech content",
      "avatar": "https://cdn.bsky.app/img/avatar/...",
      "createdAt": "2023-06-15T10:00:00Z"
    }
  ],
  "cursor": "cursor-string"
}
```

#### Search Leaflet Docs

Search for Leaflet documents that link to a specific URL.

**Endpoint:** `GET /api/search/leaflet-docs`

**Query Parameters:**

* `url` (required, string) - The URL to search for
* `limit` (optional, number) - Items to return
* `cursor` (optional, string) - Pagination cursor

**Response:** `SearchLeafletDocsForUrlResponse`

```typescript
interface SearchLeafletDocsForUrlResponse {
  urls: UrlView[];
  cursor?: string;
  total: number;
}
```

**Example Request:**

```bash
GET /api/search/leaflet-docs?url=https://example.com/article&limit=10
```

**Example Response:**

```json
{
  "urls": [
    {
      "url": "https://leaflet-doc.com/xyz",
      "metadata": {
        "url": "https://leaflet-doc.com/xyz",
        "title": "Document citing example.com"
      },
      "urlLibraryCount": 2
    }
  ],
  "cursor": "cursor-string",
  "total": 5
}
```

***

### Common Types

#### User

```typescript
interface User {
  did: string; // Decentralized identifier
  handle: string; // User handle (e.g., alice.bsky.social)
  displayName?: string; // Display name
  avatar?: string; // Avatar image URL
  description?: string; // Bio/description
}
```

#### UrlCard

```typescript
interface UrlCard {
  id: string;
  type: 'URL';
  url: string;
  uri?: string; // AT Protocol URI
  cardContent: UrlMetadata;
  libraryCount: number; // Users who saved this card
  urlLibraryCount: number; // Users who saved this URL (any card)
  urlInLibrary?: boolean; // If authenticated, whether user saved this URL
  createdAt: string; // ISO 8601 datetime
  updatedAt: string; // ISO 8601 datetime
  author: User;
  note?: {
    id: string;
    text: string;
  };
}
```

#### Collection

```typescript
interface Collection {
  id: string;
  uri?: string; // AT Protocol URI
  name: string;
  author: User;
  description?: string;
  accessType?: CollectionAccessType; // OPEN or CLOSED
  cardCount: number;
  createdAt: string; // ISO 8601 datetime
  updatedAt: string; // ISO 8601 datetime
}
```

#### Pagination

```typescript
interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
```

#### FeedPagination

```typescript
interface FeedPagination {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
  beforeId?: string; // Cursor for next page
}
```

#### Enums

```typescript
enum UrlType {
  ARTICLE = 'article',
  LINK = 'link',
  BOOK = 'book',
  RESEARCH = 'research',
  AUDIO = 'audio',
  VIDEO = 'video',
  SOCIAL = 'social',
  EVENT = 'event',
  SOFTWARE = 'software',
}

enum ActivitySource {
  MARGIN = 'margin',
  SEMBLE = 'semble',
}

enum CollectionAccessType {
  OPEN = 'OPEN', // Anyone can add cards
  CLOSED = 'CLOSED', // Only owner can add cards
}
```

***

### Error Responses

All endpoints may return standard HTTP error responses:

#### 400 Bad Request

Invalid request parameters.

```json
{
  "message": "Invalid URL parameter"
}
```

#### 401 Unauthorized

Authentication required but not provided (only for protected endpoints).

```json
{
  "message": "No access token provided"
}
```

#### 403 Forbidden

Invalid or expired authentication token.

```json
{
  "message": "Invalid or expired token"
}
```

#### 404 Not Found

Resource not found.

```json
{
  "message": "Card not found"
}
```

#### 500 Internal Server Error

Server error occurred.

```json
{
  "message": "Internal server error"
}
```

***

### Rate Limiting

The API may implement rate limiting. When rate limited, you'll receive a `429 Too Many Requests` response with retry information in headers.

***

### Notes

* All timestamps are in ISO 8601 format (e.g., `2024-01-15T10:30:00Z`)
* All IDs are UUIDs unless otherwise specified
* Optional authentication enhances responses but is not required
* Pagination defaults: `page=1`, `limit=20`
* Sorting defaults: `sortBy=createdAt`, `sortOrder=desc`

***

### Support

For issues, feature requests, or questions about the API, please contact the Semble team or file an issue on the project repository.
