# URL Semantic Search Architecture

This document outlines the URL semantic search system that provides similarity-based URL discovery using vector embeddings and semantic search capabilities.

## System Overview

The URL semantic search system consists of:

1. **Search Worker** - Processes `CardAddedToLibraryEvent` to index URLs for search
2. **Vector Database Interface** - Abstracts vector storage and similarity search
3. **Search Service** - Coordinates indexing and querying operations
4. **Use Cases** - Command and query operations for search functionality

## Architecture Components

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Search System                            │
│                                                             │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │ IndexUrlForSearch│    │GetSimilarUrlsFor│                │
│  │    UseCase      │    │   UrlUseCase    │                │
│  └─────────────────┘    └─────────────────┘                │
│           │                       │                        │
│           v                       v                        │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              SearchService                              ││
│  └─────────────────────────────────────────────────────────┘│
│           │                       │                        │
│           v                       v                        │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │ IVectorDatabase │    │ IMetadataService│                │
│  │   Interface     │    │                 │                │
│  └─────────────────┘    └─────────────────┘                │
└─────────────────────────────────────────────────────────────┘
```

### Event Flow

```
CardAddedToLibraryEvent
         │
         v
┌─────────────────┐
│  Search Worker  │
│                 │
│ ┌─────────────┐ │
│ │CardAddedTo  │ │
│ │LibraryEvent │ │
│ │Handler      │ │
│ └─────────────┘ │
│        │        │
│        v        │
│ ┌─────────────┐ │
│ │IndexUrlFor  │ │
│ │SearchUseCase│ │
│ └─────────────┘ │
└─────────────────┘
         │
         v
┌─────────────────┐
│ SearchService   │
│                 │
│ 1. Get metadata │
│ 2. Generate     │
│    embeddings   │
│ 3. Store in     │
│    vector DB    │
└─────────────────┘
```

## Data Types

### URL View (Search Result)

```typescript
export interface UrlView {
  url: string;
  metadata: {
    url: string;
    title?: string;
    description?: string;
    author?: string;
    thumbnailUrl?: string;
  };
  urlLibraryCount: number;
  urlInLibrary?: boolean;
}
```

### Search Parameters

```typescript
export interface GetSimilarUrlsForUrlParams extends PaginatedParams {
  url: string;
}

export interface GetSimilarUrlsForUrlResponse {
  urls: UrlView[];
  pagination: Pagination;
}
```

### Vector Database Interface

```typescript
export interface IVectorDatabase {
  indexUrl(params: IndexUrlParams): Promise<Result<void>>;
  findSimilarUrls(
    params: FindSimilarUrlsParams,
  ): Promise<Result<UrlSearchResult[]>>;
  deleteUrl(url: string): Promise<Result<void>>;
}

export interface IndexUrlParams {
  url: string;
  title?: string;
  description?: string;
  author?: string;
  content: string; // Combined text for embedding
}

export interface FindSimilarUrlsParams {
  url: string;
  limit: number;
  threshold?: number; // Similarity threshold
}

export interface UrlSearchResult {
  url: string;
  similarity: number;
  metadata: {
    title?: string;
    description?: string;
    author?: string;
  };
}
```

## Deployment Contexts

### 1. Production (Fly.io)

```
┌─────────────────┐    ┌─────────────────┐
│   Web Process   │    │ Search Worker   │
│                 │    │   Process       │
│ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │GetSimilar   │ │    │ │EventHandler │ │
│ │UrlsUseCase  │ │    │ │             │ │
│ └─────────────┘ │    │ └─────────────┘ │
│        │        │    │        │        │
│        v        │    │        v        │
│ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │SearchService│ │    │ │IndexUrlFor  │ │
│ │             │ │    │ │SearchUseCase│ │
│ └─────────────┘ │    │ └─────────────┘ │
│        │        │    │        │        │
└────────┼────────┘    └────────┼────────┘
         │                      │
         v                      v
    ┌─────────────────────────────────┐
    │           Redis                 │
    │  ┌─────────────────────────────┐│
    │  │     search Queue            ││
    │  │ ┌─────────────────────────┐ ││
    │  │ │CardAddedToLibraryEvent  │ ││
    │  │ └─────────────────────────┘ ││
    │  └─────────────────────────────┘│
    └─────────────────────────────────┘
         │                      │
         v                      v
    ┌─────────────┐    ┌─────────────┐
    │Vector DB    │    │PostgreSQL   │
    │(Pinecone/   │    │(URL metadata│
    │ Weaviate)   │    │ + counts)   │
    └─────────────┘    └─────────────┘
```

**Configuration:**

- `USE_IN_MEMORY_EVENTS=false`
- `VECTOR_DB_URL` configured (Pinecone, Weaviate, etc.)
- Separate search worker process

### 2. Local Development

```
┌─────────────────────────────────────┐
│         Combined Process            │
│                                     │
│ ┌─────────────┐    ┌─────────────┐  │
│ │GetSimilar   │    │EventHandler │  │
│ │UrlsUseCase  │    │             │  │
│ └─────────────┘    └─────────────┘  │
│        │                  │         │
│        v                  v         │
│ ┌─────────────┐    ┌─────────────┐  │
│ │SearchService│    │IndexUrlFor  │  │
│ │             │    │SearchUseCase│  │
│ └─────────────┘    └─────────────┘  │
│        │                  │         │
└────────┼──────────────────┼─────────┘
         │                  │
         v                  v
    ┌─────────────────────────────────┐
    │        Local Redis              │
    │  ┌─────────────────────────────┐│
    │  │     search Queue            ││
    │  └─────────────────────────────┘│
    └─────────────────────────────────┘
         │                  │
         v                  v
    ┌─────────────┐    ┌─────────────┐
    │Local Vector │    │PostgreSQL   │
    │DB (Docker)  │    │(Docker)     │
    └─────────────┘    └─────────────┘
```

**Configuration:**

- `USE_IN_MEMORY_EVENTS=false`
- Local vector DB via Docker (Weaviate/Qdrant)
- Both web app and search worker in same process

### 3. Local Mock Development

```
┌─────────────────────────────────────┐
│         Single Process              │
│                                     │
│ ┌─────────────┐    ┌─────────────┐  │
│ │GetSimilar   │    │EventHandler │  │
│ │UrlsUseCase  │    │             │  │
│ └─────────────┘    └─────────────┘  │
│        │                  │         │
│        v                  v         │
│ ┌─────────────┐    ┌─────────────┐  │
│ │SearchService│    │IndexUrlFor  │  │
│ │             │    │SearchUseCase│  │
│ └─────────────┘    └─────────────┘  │
│        │                  │         │
│        └──────────────────┘         │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │    InMemoryVectorDatabase       │ │
│ │  - Map-based storage            │ │
│ │  - Simple cosine similarity     │ │
│ │  - No external dependencies     │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

**Configuration:**

- `USE_IN_MEMORY_EVENTS=true`
- `USE_MOCK_VECTOR_DB=true`
- No external vector DB required
- Simple in-memory similarity using basic text matching

## Search Worker Implementation

### Event Handler

```typescript
export class CardAddedToLibraryEventHandler implements IEventHandler<CardAddedToLibraryEvent> {
  constructor(private indexUrlForSearchUseCase: IndexUrlForSearchUseCase) {}

  async handle(event: CardAddedToLibraryEvent): Promise<Result<void>> {
    // Only index URL cards
    const cardResult = await this.getCardDetails(event.cardId);
    if (cardResult.isErr() || !cardResult.value.isUrlCard) {
      return ok(undefined);
    }

    return this.indexUrlForSearchUseCase.execute({
      url: cardResult.value.url,
      cardId: event.cardId.getStringValue(),
    });
  }
}
```

### Search Service

```typescript
export class SearchService {
  constructor(
    private vectorDatabase: IVectorDatabase,
    private metadataService: IMetadataService,
    private cardQueryRepository: ICardQueryRepository,
  ) {}

  async indexUrl(url: string): Promise<Result<void>> {
    // 1. Get metadata
    const metadataResult = await this.metadataService.fetchMetadata(url);
    if (metadataResult.isErr()) {
      return err(metadataResult.error);
    }

    // 2. Prepare content for embedding
    const content = this.prepareContentForEmbedding(metadataResult.value);

    // 3. Index in vector database
    return this.vectorDatabase.indexUrl({
      url: url.value,
      title: metadataResult.value.title,
      description: metadataResult.value.description,
      author: metadataResult.value.author,
      content,
    });
  }

  async findSimilarUrls(
    url: string,
    options: { limit: number; threshold?: number },
  ): Promise<Result<UrlView[]>> {
    // 1. Find similar URLs from vector DB
    const similarResult = await this.vectorDatabase.findSimilarUrls({
      url,
      limit: options.limit,
      threshold: options.threshold,
    });

    if (similarResult.isErr()) {
      return err(similarResult.error);
    }

    // 2. Enrich with library counts and user context
    const enrichedUrls = await this.enrichUrlsWithContext(similarResult.value);

    return ok(enrichedUrls);
  }
}
```

## Queue Configuration

The search queue is added to the existing queue routing:

```typescript
// BullMQEventPublisher.getTargetQueues()
switch (eventName) {
  case EventNames.CARD_ADDED_TO_LIBRARY:
    return [QueueNames.FEEDS, QueueNames.SEARCH, QueueNames.ANALYTICS];
  case EventNames.CARD_ADDED_TO_COLLECTION:
    return [QueueNames.FEEDS];
  default:
    return [QueueNames.FEEDS];
}
```

## Vector Database Implementations

### Production: Pinecone/Weaviate

```typescript
export class PineconeVectorDatabase implements IVectorDatabase {
  constructor(private client: PineconeClient) {}

  async indexUrl(params: IndexUrlParams): Promise<Result<void>> {
    // Generate embeddings and upsert to Pinecone
  }

  async findSimilarUrls(
    params: FindSimilarUrlsParams,
  ): Promise<Result<UrlSearchResult[]>> {
    // Query Pinecone for similar vectors
  }
}
```

### Local Development: Weaviate/Qdrant (Docker)

```typescript
export class WeaviateVectorDatabase implements IVectorDatabase {
  constructor(private client: WeaviateClient) {}

  async indexUrl(params: IndexUrlParams): Promise<Result<void>> {
    // Index in local Weaviate instance
  }

  async findSimilarUrls(
    params: FindSimilarUrlsParams,
  ): Promise<Result<UrlSearchResult[]>> {
    // Query local Weaviate instance
  }
}
```

### Local Mock: In-Memory

```typescript
export class InMemoryVectorDatabase implements IVectorDatabase {
  private urls: Map<string, IndexedUrl> = new Map();

  async indexUrl(params: IndexUrlParams): Promise<Result<void>> {
    // Store in memory with simple text-based similarity
    this.urls.set(params.url, {
      url: params.url,
      content: params.content,
      metadata: { title: params.title, description: params.description },
    });
    return ok(undefined);
  }

  async findSimilarUrls(
    params: FindSimilarUrlsParams,
  ): Promise<Result<UrlSearchResult[]>> {
    // Simple text similarity using keyword matching
    const results = Array.from(this.urls.values())
      .filter(
        (indexed) =>
          this.calculateSimilarity(params.url, indexed.content) > 0.3,
      )
      .map((indexed) => ({
        url: indexed.url,
        similarity: this.calculateSimilarity(params.url, indexed.content),
        metadata: indexed.metadata,
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, params.limit);

    return ok(results);
  }

  private calculateSimilarity(query: string, content: string): number {
    // Simple keyword-based similarity for mocking
    const queryWords = query.toLowerCase().split(/\W+/);
    const contentWords = content.toLowerCase().split(/\W+/);
    const intersection = queryWords.filter((word) =>
      contentWords.includes(word),
    );
    return (
      intersection.length / Math.max(queryWords.length, contentWords.length)
    );
  }
}
```

## Environment Variables

```bash
# Vector database configuration
VECTOR_DB_TYPE=pinecone|weaviate|qdrant|mock
VECTOR_DB_URL=https://your-vector-db-endpoint
VECTOR_DB_API_KEY=your-api-key

# Search configuration
SEARCH_SIMILARITY_THRESHOLD=0.7
SEARCH_DEFAULT_LIMIT=20

# Mock configuration
USE_MOCK_VECTOR_DB=true|false
```

## Local Development Commands

### `npm run dev` (Redis + BullMQ + Vector DB)

- Uses real vector database (Docker)
- Separate search worker process
- Full production-like behavior

### `npm run dev:mock` (In-Memory)

- Uses `InMemoryVectorDatabase`
- Simple text-based similarity
- No external dependencies

### `npm run search-worker` (Dedicated Search Worker)

- Runs only the search worker process
- For scaling search processing separately

## Performance Considerations

### Indexing Strategy

- **Immediate Indexing**: Index URLs as soon as they're added to library
- **Batch Processing**: For high-volume scenarios, batch index operations
- **Deduplication**: Avoid re-indexing the same URL multiple times

### Query Optimization

- **Caching**: Cache similar URL results for popular queries
- **Pagination**: Implement cursor-based pagination for large result sets
- **Filtering**: Pre-filter results by library counts or user context

### Scaling

- **Horizontal Scaling**: Multiple search worker instances
- **Vector DB Sharding**: Partition URLs across multiple vector DB instances
- **CDN Caching**: Cache search results at CDN level for popular queries

## Integration Points

### With Existing Systems

1. **Card System**: Listens to `CardAddedToLibraryEvent`
2. **Metadata Service**: Reuses existing URL metadata fetching
3. **Query Repository**: Enriches results with library counts
4. **Profile Service**: Adds user context to results

### API Endpoints

```typescript
// GET /api/search/similar-urls?url=https://example.com&limit=10
app.get('/api/search/similar-urls', async (req, res) => {
  const result = await getSimilarUrlsForUrlUseCase.execute({
    url: req.query.url,
    limit: parseInt(req.query.limit) || 10,
    page: parseInt(req.query.page) || 1,
  });

  res.json(result);
});
```

This architecture provides a scalable, testable URL semantic search system that integrates seamlessly with the existing event-driven architecture while supporting different deployment contexts from local development to production.
