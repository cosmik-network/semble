# Shared Type Unification Plan - DDD-Aligned Implementation

## Executive Summary

This document provides a comprehensive implementation plan for sharing types between the backend and frontend using npm workspaces. **This approach follows proper DDD/layered architecture principles** - it's not a compromise or shortcut.

### Quick Answer: Why Not Add Mappers?

**TL;DR**: You already have the important mapper (Domain → Application), and adding another layer (Application → Infrastructure) would just be ceremony when the types are identical.

**You're already doing this (correct DDD):**

```
Domain Entity → Use Case (maps to DTO) → Controller (passes through) → Frontend
     ↓                                          ↓                          ↓
Rich domain model           Application Layer DTO              Same DTO
```

**The shared types represent the Application Layer**, not Infrastructure. Both backend controllers and frontend clients consume the same Application Layer contract - this is **textbook Ports & Adapters pattern**.

**When you WOULD need mappers:**

- API versioning (supporting v1 and v2)
- Multiple protocols (REST + GraphQL + gRPC)
- Public API (hiding internal structures)
- Different client needs (mobile vs web)

See "When Would You Need Mappers?" section for details.

**Bottom line**: Your architecture is already sound. The `@semble/types` package represents Application Layer contracts that both backend and frontend depend on (correct dependency direction).

## Current State Analysis

### What Exists Today

**Backend DTOs** (`src/modules/cards/application/dtos/`):

- `UserProfileDTO`, `UrlCardDTO`, `NoteCardDTO`, `CollectionDTO`
- `PaginationDTO`, `CardSortingDTO`, `CollectionSortingDTO`
- `FeedItemDTO`
- These are used as return types from Use Cases

**Frontend Types** (`src/webapp/api-client/types/`):

- `requests.ts` - Request parameter interfaces
- `responses.ts` - Response type interfaces (User, UrlCard, Collection, etc.)
- Nearly identical to backend DTOs (already unified in recent work)

**Current Flow**:

```
Domain Model → Use Case (returns DTO) → Controller (returns DTO as-is) → Frontend (expects matching type)
```

### The Problem

1. **Duplication**: Same types exist in backend DTOs and frontend response types
2. **Drift Risk**: Changes must be manually synchronized between backend and frontend
3. **No Validation**: Controllers accept `any` types, then use cases validate

## Architectural Philosophy

### DDD Layered Architecture Review

**Classic DDD Layers:**

1. **Domain Layer**: Entities, Value Objects, Domain Services, Domain Events
2. **Application Layer**: Use Cases, DTOs, Application Services
3. **Infrastructure Layer**: Controllers, Repositories, External Services
4. **Presentation Layer**: UI Components, API Clients

### Understanding the Mapping Question

**Your codebase ALREADY does Domain → Application mapping:**

```typescript
// Domain Entity (lives in domain layer)
class Collection {
  collectionId: CollectionId;
  name: CollectionName;
  authorId: UserId;
  description?: CollectionDescription;
  // ... rich domain behavior
}

// Use Case maps Domain → DTO (Application Layer)
async execute(): Promise<Result<CollectionDTO>> {
  const collection = await this.repo.findById(id);

  return {
    id: collection.collectionId.value,
    name: collection.name.toString(),
    author: { ... },  // fetched and mapped
    description: collection.description?.value,
    cardCount: collection.cardCount,
    createdAt: collection.createdAt.toISOString(),
    updatedAt: collection.updatedAt.toISOString(),
  };
}
```

**The question is: Do you need Controller → HTTP Response mapping?**

### Three Approaches Compared

#### Option 1: Pure DDD with Mappers (Maximum Separation)

```typescript
// Domain Layer
class Collection { /* rich domain model */ }

// Application Layer
interface CollectionDTO {
  id: string;
  name: string;
  // ... internal representation
}

// Infrastructure Layer
interface CollectionHttpResponse {
  id: string;
  name: string;
  // ... HTTP API representation
}

// Controller has mapper
async executeImpl(req, res) {
  const result = await this.useCase.execute(query);
  const httpResponse = this.mapDtoToHttpResponse(result.value);
  return this.ok(res, httpResponse);
}
```

**When you need this:**

- ✅ Public API that needs versioning independent of domain
- ✅ Domain model significantly different from API representation
- ✅ Multiple API formats (REST, GraphQL, gRPC) from same domain
- ✅ Need to hide internal domain details from external consumers
- ✅ Large team with separate domain/API teams

**Drawbacks:**

- ❌ High ceremony when DTO ≈ HTTP Response
- ❌ Boilerplate mapper code
- ❌ Slower iteration velocity

#### Option 2: Shared Application Layer Types (Recommended)

```typescript
// Shared Types Package (@semble/types)
// Conceptually lives in Application Layer
interface Collection {
  id: string;
  name: string;
  author: User;
  // ...
}

// Use Case returns Application Layer type
async execute(): Promise<Result<Collection>> {
  // Maps Domain → Application DTO
  return this.mapDomainToDTO(domainCollection);
}

// Controller passes through (no mapping needed)
async executeImpl(req, res) {
  const result = await this.useCase.execute(query);
  return this.ok<Collection>(res, result.value);
}

// Frontend uses same Application Layer type
async getCollection(): Promise<Collection> {
  return this.http.get('/collections/123');
}
```

**When this is appropriate:**

- ✅ Monorepo with tight frontend/backend coupling
- ✅ DTO and HTTP Response are identical (or nearly so)
- ✅ Private/internal API (not public third-party API)
- ✅ Small team that values velocity
- ✅ You're already mapping Domain → DTO properly

**Key insight:** The shared types represent the **Application Layer contract**, not Infrastructure. Both the backend Use Case and frontend are clients of this application layer contract.

**Drawbacks:**

- ⚠️ Harder to version API independently
- ⚠️ Frontend sees application layer types (but this may be fine)

#### Option 3: Infrastructure-Owned Types with Reverse Mapping (Anti-Pattern)

```typescript
// Infrastructure defines types
interface CollectionHttpResponse { /* ... */ }

// Use Case returns infrastructure type (WRONG!)
async execute(): Promise<Result<CollectionHttpResponse>> {
  // Use case now depends on infrastructure layer
}
```

**This is an anti-pattern** because:

- ❌ Use Cases depend on Infrastructure (breaks DDD layering)
- ❌ Application layer coupled to HTTP representation
- ❌ Can't reuse Use Cases for non-HTTP interfaces

### Our Recommendation: Option 2 (Shared Application Types)

**Why this is the right choice for your codebase:**

1. **You're already mapping Domain → Application:**

   ```typescript
   // GetCollectionsForUrlUseCase.ts - lines 122-151
   const enrichedCollections: CollectionDTO[] = await Promise.all(
     result.items.map(async (item) => {
       // Fetching related data
       const author = profileMap.get(item.authorId);
       const collection = await this.collectionRepo.findById(...);

       // Mapping domain to DTO
       return {
         id: item.id,
         uri: item.uri,
         name: item.name,
         description: item.description,
         author,  // enriched
         cardCount: collection.cardCount,
         createdAt: collection.createdAt.toISOString(),
         updatedAt: collection.updatedAt.toISOString(),
       };
     })
   );
   ```

   This is **proper DDD** - the Use Case orchestrates domain objects and produces DTOs.

2. **Your DTOs ARE your HTTP responses:**
   - Backend `CollectionDTO` is identical to frontend `Collection`
   - No transformation happens in controllers
   - Controllers just pass through the DTO

3. **The shared types represent Application Layer, not Infrastructure:**
   - Think of it as: "The Application Layer contract that both backend and frontend implement"
   - Backend: Use Cases produce this contract
   - Frontend: API Client consumes this contract
   - Infrastructure (controllers): Just pipes the data through

4. **You maintain proper boundaries:**
   ```
   Domain Layer (Rich Models)
        ↓
   Application Layer (DTOs - Shared Types)
        ↓
   Infrastructure (HTTP) ← → Frontend (HTTP Client)
   ```

### When Would You Need Mappers?

Add a separate HTTP Response layer if:

1. **API Versioning:**

   ```typescript
   // v1: { id, name }
   // v2: { id, title } // renamed field

   // Use mapper to support both versions
   function mapToV1(dto: CollectionDTO): CollectionV1Response {
     return { id: dto.id, name: dto.name };
   }
   ```

2. **Different Representations:**

   ```typescript
   // REST API: flat structure
   { collectionId: '123', authorId: '456' }

   // GraphQL: nested structure
   { id: '123', author: { id: '456', name: '...' } }
   ```

3. **Hide Internal Details:**

   ```typescript
   // DTO has internal fields
   interface CollectionDTO {
     id: string;
     name: string;
     internalAuditLog: AuditEntry[]; // don't expose
   }

   // HTTP response filters
   interface CollectionResponse {
     id: string;
     name: string;
     // no audit log
   }
   ```

4. **Multiple Clients with Different Needs:**
   - Mobile app needs smaller payloads
   - Admin dashboard needs more details
   - Public API needs sanitized data

### Implementation Strategy

**Organize shared types by architectural layer:**

```typescript
// src/types/src/api/
// These are Application Layer DTOs, not Infrastructure types

// common.ts - Core domain concepts
export interface User {
  /* ... */
}
export interface Collection {
  /* ... */
}

// requests.ts - Use Case inputs
export interface GetCollectionsParams {
  /* ... */
}

// responses.ts - Use Case outputs
export interface GetCollectionsResponse {
  /* ... */
}
```

**Use Cases depend on these types:**

```typescript
import { GetCollectionsResponse } from '@semble/types';

class GetCollectionsUseCase {
  async execute(params): Promise<Result<GetCollectionsResponse>> {
    // Maps Domain → Application DTO
  }
}
```

**Controllers are thin pipes:**

```typescript
import { GetCollectionsResponse } from '@semble/types';

class GetCollectionsController {
  async executeImpl(req, res) {
    const result = await this.useCase.execute(params);
    return this.ok<GetCollectionsResponse>(res, result.value);
  }
}
```

**Frontend consumes Application Layer contract:**

```typescript
import { GetCollectionsResponse } from '@semble/types';

class ApiClient {
  async getCollections(): Promise<GetCollectionsResponse> {
    return this.http.get('/collections');
  }
}
```

### Summary

**What we're doing:**

- ✅ Sharing **Application Layer** types between backend and frontend
- ✅ Use Cases map Domain → Application DTO (proper DDD)
- ✅ Controllers validate HTTP and pass through DTOs
- ✅ Single source of truth for application contracts

**What we're NOT doing:**

- ❌ Skipping Domain → Application mapping (we do this!)
- ❌ Letting infrastructure dictate application types
- ❌ Breaking DDD layer dependencies

**This is pragmatic DDD because:**

- Domain layer remains pure ✅
- Application layer defines contracts ✅
- Infrastructure depends on Application (correct direction) ✅
- Frontend and Backend share Application contracts (pragmatic) ✅

The key realization: In a monorepo where frontend and backend deploy together, **sharing Application Layer types is not a DDD violation** - it's recognizing that both are clients of the same application layer.

## Validation Strategy in DDD

### Three Levels of Validation

#### 1. Controller-Level Validation (Infrastructure Layer)

**Purpose**: Validate HTTP request structure and types
**Implementation**: Use Zod schemas at controller entry points
**Examples**:

- Is `url` parameter present and a string?
- Is `page` a positive integer?
- Are required fields in request body present?

**Where**: `src/modules/*/infrastructure/http/controllers/*`

```typescript
// Example: GetCollectionsForUrlController.ts
import { z } from 'zod';

const querySchema = z.object({
  url: z.string().url(),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).optional(),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt', 'cardCount']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

async executeImpl(req: Request, res: Response) {
  const validationResult = querySchema.safeParse(req.query);
  if (!validationResult.success) {
    return this.badRequest(res, validationResult.error.message);
  }

  const query = validationResult.data;
  // Pass validated data to use case...
}
```

#### 2. Use Case-Level Validation (Application Layer)

**Purpose**: Validate business rules and create domain objects
**Implementation**: Use domain value objects (already doing this!)
**Examples**:

- `URL.create(query.url)` - validates URL format using domain rules
- `CardId.createFromString(id)` - validates ID format
- Business logic validation (e.g., "user can only have 50 collections")

**Where**: `src/modules/*/application/useCases/*`

This layer is **already correct** in the codebase!

#### 3. Domain-Level Validation (Domain Layer)

**Purpose**: Enforce invariants and domain rules
**Implementation**: Value Objects and Entity constructors
**Examples**:

- `URL` value object validates URL format
- `CollectionName` might enforce length limits
- `Email` value object validates email format

**Where**: `src/modules/*/domain/value-objects/*`, entities

This layer is **already correct** in the codebase!

### Validation Summary

**Current state**: ✅ Good DDD validation (levels 2 & 3 already implemented)
**What we'll add**: Level 1 (Zod schemas at controllers) for better error messages

## Proposed Architecture

### Directory Structure

```
semble/
├── package.json                          # Root workspace config
├── src/
│   ├── types/                           # @semble/types package (NEW)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── api/
│   │   │   │   ├── common.ts           # User, Pagination, Sorting
│   │   │   │   ├── requests.ts         # Request types
│   │   │   │   ├── responses.ts        # Response types
│   │   │   │   ├── index.ts            # Re-exports
│   │   │   └── index.ts                # Main entry
│   │   └── dist/                       # Compiled output
│   │
│   ├── modules/
│   │   ├── cards/
│   │   │   ├── domain/                 # Keep domain layer pure
│   │   │   ├── application/
│   │   │   │   ├── useCases/
│   │   │   │   │   └── queries/
│   │   │   │   │       └── GetCollectionsForUrlUseCase.ts
│   │   │   │   │           # Now returns @semble/types
│   │   │   │   └── dtos/              # REMOVE (replaced by @semble/types)
│   │   │   └── infrastructure/
│   │   │       └── http/
│   │   │           └── controllers/    # Add Zod validation
│   │   │               └── GetCollectionsForUrlController.ts
│   │   └── feeds/
│   │       └── ... (similar structure)
│   │
│   ├── webapp/
│   │   ├── package.json                # Adds @semble/types dependency
│   │   └── api-client/
│   │       ├── ApiClient.ts            # Imports @semble/types
│   │       └── types/                  # REMOVE (replaced by @semble/types)
│   │
│   └── shared/                         # Keep existing backend shared utils
```

### Type Organization

**`src/types/src/api/common.ts`** - Shared domain concepts:

```typescript
export interface User {
  id: string;
  name: string;
  handle: string;
  avatarUrl?: string;
  description?: string;
}

export interface Pagination {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasMore: boolean;
  limit: number;
}

export interface FeedPagination extends Pagination {
  nextCursor?: string;
}

export interface BaseSorting {
  sortOrder: 'asc' | 'desc';
}

export interface CardSorting extends BaseSorting {
  sortBy: 'createdAt' | 'updatedAt' | 'libraryCount';
}

export interface CollectionSorting extends BaseSorting {
  sortBy: 'name' | 'createdAt' | 'updatedAt' | 'cardCount';
}
```

**`src/types/src/api/requests.ts`** - API request types:

```typescript
// Base interfaces
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface SortingParams {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Query parameter interfaces
export interface GetCollectionsForUrlParams
  extends PaginationParams, SortingParams {
  url: string;
}

// Command request interfaces
export interface AddUrlToLibraryRequest {
  url: string;
  note?: string;
  collectionIds?: string[];
}

// ... etc
```

**`src/types/src/api/responses.ts`** - API response types:

```typescript
import { User, Pagination, CardSorting, CollectionSorting } from './common';

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
  author: User;
  note?: {
    id: string;
    text: string;
  };
}

export interface Collection {
  id: string;
  uri?: string;
  name: string;
  author: User;
  description?: string;
  cardCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface GetCollectionsForUrlResponse {
  collections: Collection[];
  pagination: Pagination;
  sorting: CollectionSorting;
}

// ... etc
```

## Implementation Plan

### Phase 0: Prerequisites

**Install Zod for validation:**

```bash
npm install zod
```

### Phase 1: Create Shared Types Package (Infrastructure)

#### 1.1 Configure Workspace Root

Update `package.json`:

```json
{
  "name": "semble",
  "workspaces": ["src/types", "src/webapp"],
  "scripts": {
    "build:types": "npm run build --workspace=@semble/types",
    "dev:types": "npm run dev --workspace=@semble/types",
    "type-check": "tsc --noEmit && npm run type-check --workspace=@semble/webapp"
  }
}
```

#### 1.2 Create Types Package

Create `src/types/package.json`:

```json
{
  "name": "@semble/types",
  "version": "1.0.0",
  "description": "Shared TypeScript types for Semble API",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist/**/*"],
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "clean": "rm -rf dist"
  },
  "devDependencies": {
    "typescript": "^5.8.3"
  }
}
```

Create `src/types/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

#### 1.3 Copy Types from Frontend

1. Copy content from `src/webapp/api-client/types/` to `src/types/src/api/`
2. Organize into `common.ts`, `requests.ts`, `responses.ts`
3. Create index files for re-exports
4. Build: `cd src/types && npm run build`

### Phase 2: Update Backend to Use Shared Types

#### 2.1 Add Dependency

Update root `package.json`:

```json
{
  "dependencies": {
    "@semble/types": "workspace:*",
    "zod": "^3.22.4"
  }
}
```

Run `npm install`

#### 2.2 Update Use Cases

**Example: `GetCollectionsForUrlUseCase.ts`**

Before:

```typescript
import { CollectionDTO, PaginationDTO, CollectionSortingDTO } from '../../dtos';

export interface GetCollectionsForUrlResult {
  collections: CollectionDTO[];
  pagination: PaginationDTO;
  sorting: CollectionSortingDTO;
}
```

After:

```typescript
import { GetCollectionsForUrlResponse } from '@semble/types';

// Use the shared type directly as the return type
export type GetCollectionsForUrlResult = GetCollectionsForUrlResponse;

// Or inline it:
async execute(query: GetCollectionsForUrlQuery): Promise<Result<GetCollectionsForUrlResponse>> {
  // ... implementation returns GetCollectionsForUrlResponse
}
```

#### 2.3 Update Controllers with Validation

**Example: `GetCollectionsForUrlController.ts`**

Before:

```typescript
async executeImpl(req: Request, res: Response): Promise<any> {
  const { url } = req.query;
  if (!url || typeof url !== 'string') {
    return this.badRequest(res, 'URL query parameter is required');
  }
  // ...
}
```

After:

```typescript
import { z } from 'zod';
import { GetCollectionsForUrlParams, GetCollectionsForUrlResponse } from '@semble/types';

// Define validation schema
const querySchema = z.object({
  url: z.string().min(1, 'URL is required'),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt', 'cardCount']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

async executeImpl(req: Request, res: Response): Promise<any> {
  // Validate request
  const validation = querySchema.safeParse(req.query);
  if (!validation.success) {
    return this.badRequest(res, validation.error.format());
  }

  const params: GetCollectionsForUrlParams = validation.data;

  const result = await this.getCollectionsForUrlUseCase.execute({
    url: params.url,
    page: params.page,
    limit: params.limit,
    sortBy: params.sortBy as CollectionSortField | undefined,
    sortOrder: params.sortOrder as SortOrder | undefined,
  });

  if (result.isErr()) {
    return this.fail(res, result.error);
  }

  // result.value is GetCollectionsForUrlResponse
  return this.ok<GetCollectionsForUrlResponse>(res, result.value);
}
```

#### 2.4 Remove Old DTOs

Once all use cases and controllers are updated:

```bash
rm -rf src/modules/cards/application/dtos/
rm -rf src/modules/user/application/dtos/
```

### Phase 3: Update Frontend to Use Shared Types

#### 3.1 Add Dependency

Update `src/webapp/package.json`:

```json
{
  "dependencies": {
    "@semble/types": "workspace:*"
  }
}
```

Run `npm install`

#### 3.2 Update ApiClient

**`src/webapp/api-client/ApiClient.ts`**

Before:

```typescript
import type {
  GetCollectionsForUrlParams,
  GetCollectionsForUrlResponse,
} from './types';
```

After:

```typescript
import type {
  GetCollectionsForUrlParams,
  GetCollectionsForUrlResponse,
} from '@semble/types';
```

#### 3.3 Remove Old Types

```bash
rm -rf src/webapp/api-client/types/
```

### Phase 4: Development Workflow Setup

#### 4.1 Add Development Scripts

Update root `package.json`:

```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:types\" \"npm run dev:webapp\" \"npm run dev:backend\"",
    "dev:types": "npm run dev --workspace=@semble/types",
    "dev:webapp": "npm run dev --workspace=@semble/webapp",
    "dev:backend": "npm run dev:app:inner",
    "build:all": "npm run build:types && npm run build && npm run build:webapp",
    "type-check": "tsc --noEmit && npm run type-check --workspace=@semble/webapp"
  }
}
```

#### 4.2 Update Backend tsconfig.json

Ensure backend can resolve workspace packages:

```json
{
  "compilerOptions": {
    "paths": {
      "@semble/types": ["./src/types/src"]
    }
  }
}
```

### Phase 5: Testing & Validation

#### 5.1 Type Checking

```bash
npm run type-check        # Check backend
npm run type-check --workspace=@semble/webapp  # Check frontend
```

#### 5.2 Build Everything

```bash
npm run build:all
```

#### 5.3 Runtime Testing

- Start dev servers: `npm run dev`
- Test each modified endpoint
- Verify request validation works (try invalid requests)
- Verify responses match expected types

## Migration Checklist

### Phase 1: Shared Types Package ✅

- [ ] Update root `package.json` with workspaces configuration
- [ ] Create `src/types/package.json`
- [ ] Create `src/types/tsconfig.json`
- [ ] Create `src/types/src/api/common.ts` (copy from webapp)
- [ ] Create `src/types/src/api/requests.ts` (copy from webapp)
- [ ] Create `src/types/src/api/responses.ts` (copy from webapp)
- [ ] Create `src/types/src/api/index.ts` (re-exports)
- [ ] Create `src/types/src/index.ts` (main entry)
- [ ] Build types: `cd src/types && npm install && npm run build`
- [ ] Verify build output in `src/types/dist/`

### Phase 2: Backend Migration ✅

- [ ] Install zod: `npm install zod`
- [ ] Add `@semble/types` to root dependencies
- [ ] Run `npm install` to link workspace
- [ ] Update backend tsconfig.json with paths
- [ ] For each module (cards, feeds, user):
  - [ ] Update use case imports (replace DTO imports with @semble/types)
  - [ ] Update use case return types to use shared types
  - [ ] Update controller imports
  - [ ] Add Zod validation schemas to controllers
  - [ ] Update controller methods to use validated params
  - [ ] Type controller responses
- [ ] Remove `src/modules/*/application/dtos/` directories
- [ ] Run type check: `npm run type-check`
- [ ] Fix any type errors

### Phase 3: Frontend Migration ✅

- [ ] Add `@semble/types` to `src/webapp/package.json`
- [ ] Run `npm install` in webapp
- [ ] Update `src/webapp/api-client/ApiClient.ts` imports
- [ ] Update all client files in `src/webapp/api-client/clients/`
- [ ] Remove `src/webapp/api-client/types/` directory
- [ ] Update any UI components that imported from old types
- [ ] Run type check: `npm run type-check --workspace=@semble/webapp`
- [ ] Fix any type errors

### Phase 4: Development Workflow ✅

- [ ] Add dev scripts to root package.json
- [ ] Test concurrent development: `npm run dev`
- [ ] Make a test change to shared types
- [ ] Verify hot reload works in both backend and frontend
- [ ] Test build pipeline: `npm run build:all`

### Phase 5: Testing ✅

- [ ] Backend tests pass
- [ ] Frontend tests pass
- [ ] Manual testing of key endpoints:
  - [ ] GET /api/cards/collections/for-url
  - [ ] GET /api/cards/my-cards
  - [ ] GET /api/feed/global
  - [ ] POST /api/cards/library/url
  - [ ] POST /api/collections
- [ ] Test request validation (submit invalid requests)
- [ ] Verify error messages are helpful

## Files to Modify

### High Priority (Core Queries)

**Use Cases:**

- `src/modules/cards/application/useCases/queries/GetCollectionsForUrlUseCase.ts`
- `src/modules/cards/application/useCases/queries/GetCollectionsUseCase.ts`
- `src/modules/cards/application/useCases/queries/GetLibrariesForCardUseCase.ts`
- `src/modules/cards/application/useCases/queries/GetLibrariesForUrlUseCase.ts`
- `src/modules/cards/application/useCases/queries/GetNoteCardsForUrlUseCase.ts`
- `src/modules/cards/application/useCases/queries/GetUrlCardViewUseCase.ts`
- `src/modules/cards/application/useCases/queries/GetUrlStatusForMyLibraryUseCase.ts`
- `src/modules/feeds/application/useCases/queries/GetGlobalFeedUseCase.ts`

**Controllers:**

- All controllers in `src/modules/cards/infrastructure/http/controllers/`
- `src/modules/feeds/infrastructure/http/controllers/GetGlobalFeedController.ts`

**Frontend:**

- `src/webapp/api-client/ApiClient.ts`
- All files in `src/webapp/api-client/clients/`

### Medium Priority (Commands)

**Use Cases:**

- `src/modules/cards/application/useCases/commands/AddUrlToLibraryUseCase.ts`
- `src/modules/cards/application/useCases/commands/CreateCollectionUseCase.ts`
- ... (other command use cases)

### Lower Priority

- UI components that reference types directly
- Test files
- Documentation

## Best Practices

### Type Naming Conventions

- **Requests**: `{Verb}{Resource}Request` (e.g., `AddUrlToLibraryRequest`)
- **Params**: `Get{Resource}Params` (e.g., `GetCollectionsForUrlParams`)
- **Responses**: `{Verb}{Resource}Response` (e.g., `GetCollectionsForUrlResponse`)
- **Common**: Descriptive nouns (e.g., `User`, `Pagination`, `Collection`)

### Validation Patterns

**Controller validation (structure & types):**

```typescript
const schema = z.object({
  requiredString: z.string().min(1),
  optionalNumber: z.coerce.number().optional(),
  enum: z.enum(['option1', 'option2']),
});

const result = schema.safeParse(req.body);
if (!result.success) {
  return this.badRequest(res, result.error.format());
}
```

**Use case validation (business rules):**

```typescript
const urlResult = URL.create(params.url);
if (urlResult.isErr()) {
  return err(new ValidationError(`Invalid URL: ${urlResult.error.message}`));
}
```

### Development Workflow

1. **Always run types in watch mode** during development: `npm run dev:types`
2. **Make type changes first** before implementing features
3. **Type-check frequently**: `npm run type-check`
4. **Test request validation** with invalid inputs

## Pragmatic Simplifications

### What We're NOT Doing (And Why That's OK)

❌ **Separate DTO and HTTP Response mapping layer**:

- Reason: Application DTOs and HTTP responses are identical
- Reality: Controllers would just be identity mappers (pointless ceremony)
- When to add: If you need API versioning, different client representations, or hide internal fields
- See "When Would You Need Mappers?" section above for specific scenarios

❌ **Runtime validation of Use Case outputs**:

- Reason: TypeScript compilation guarantees response shape from Use Cases
- Alternative: Could add Zod validation of DTO construction, but not needed initially
- When to add: If you have bugs where Use Cases return malformed DTOs

❌ **OpenAPI schema generation**:

- Reason: Can add later if needed (Zod schemas make this easy)
- Benefit: Shared types + Zod schemas = future OpenAPI generation is trivial
- When to add: When you want API documentation, client SDK generation, or contract testing

❌ **Separate versioning of types package**:

- Reason: Monorepo with synchronized deploys (frontend/backend always in sync)
- When to add: If you publish a public API or have multiple clients on different versions
- Note: For now, Git commits provide version history

❌ **Multiple API representations (REST, GraphQL, gRPC)**:

- Reason: Only building REST API currently
- When to add: When you need GraphQL, gRPC, or other protocols (then add mappers)

### What Makes This "Barebones But Reliable"

✅ **Proper DDD boundaries**: Domain → Application mapping happens in Use Cases
✅ **Single source of truth**: Application Layer types defined once in `@semble/types`
✅ **Compile-time safety**: TypeScript catches type mismatches immediately
✅ **Runtime validation**: Zod at controller boundaries validates incoming requests
✅ **Three-tier validation**: Infrastructure (HTTP) → Application (business rules) → Domain (invariants)
✅ **Simple workflow**: Edit shared types, both backend and frontend update automatically
✅ **Standard tooling**: npm workspaces, TypeScript, Zod (no custom tooling)
✅ **Refactor-friendly**: Easy to add mapping layer later if needed

### What Makes This "Good DDD"

✅ **Domain layer remains pure**: No external dependencies, rich behavior
✅ **Application layer orchestrates**: Use Cases compose domain objects, return DTOs
✅ **Infrastructure depends on Application**: Controllers use Application types (correct direction)
✅ **Separation of concerns**: Domain logic, application logic, HTTP transport all separated
✅ **Validation hierarchy**: Each layer validates at its level of abstraction
✅ **Type safety across boundaries**: Shared Application contracts prevent drift

The key insight: **Sharing Application Layer types between backend and frontend is not a DDD violation** when:

1. Both are clients of the same Application Layer
2. They deploy together (monorepo)
3. The Application DTOs appropriately abstract the Domain Model

## Troubleshooting

### "Cannot find module '@semble/types'"

```bash
# From root
npm install
cd src/types && npm run build
```

### Types package not updating

```bash
# Restart types watch mode
npm run dev:types
```

### Import path errors in IDE

- Restart TypeScript server in your IDE
- Check `tsconfig.json` paths configuration
- Verify `node_modules/@semble/types` symlink exists

### Validation errors not showing

- Check Zod schema matches the expected request shape
- Use `.safeParse()` not `.parse()` to get detailed errors
- Log `validation.error.format()` for debugging

## Future Enhancements

### Short Term

- [ ] Add Zod schemas for all controllers
- [ ] Create shared Zod utilities for common patterns (pagination, sorting)
- [ ] Add request/response logging middleware

### Medium Term

- [ ] Generate OpenAPI spec from shared types
- [ ] Create API documentation from types
- [ ] Add integration tests using shared types
- [ ] Create type-safe test factories

### Long Term

- [ ] Publish types package to private npm registry
- [ ] Implement breaking change detection (type diff checks)
- [ ] Add runtime response validation in development mode
- [ ] Generate client SDKs for mobile apps

## DDD Architecture Notes

### What We Preserved (Proper DDD)

✅ **Domain Layer Purity**:

- Domain entities, value objects, and domain services have no external dependencies
- Domain models encapsulate business logic and invariants
- Domain layer doesn't know about HTTP, DTOs, or frontend

✅ **Application Layer Orchestration**:

- Use Cases orchestrate domain objects to fulfill application requirements
- Use Cases map rich domain models → simple DTOs (proper anti-corruption layer)
- DTOs hide domain complexity from external consumers
- Application layer defines the contract for consumers (backend and frontend)

✅ **Infrastructure Layer Dependency Direction**:

- Controllers depend on Application types (correct: Infrastructure → Application)
- Controllers do NOT define types that Application depends on (would be wrong)
- Infrastructure implements Application contracts, not the other way around

✅ **Three-Tier Validation Hierarchy**:

- **Domain**: Invariants enforced in value objects and entities
- **Application**: Business rules validated in use cases
- **Infrastructure**: HTTP request structure validated in controllers

✅ **Separation of Concerns**:

- Domain logic in entities/value objects
- Application logic in use cases
- HTTP transport details in controllers
- Each layer has clear responsibilities

### What's Actually Happening (Not a Compromise)

✅ **Shared Application Layer Types**:

- `@semble/types` represents the **Application Layer contract**
- Backend Use Cases produce these contracts
- Frontend API Client consumes these contracts
- Both are clients of the Application Layer (this is correct DDD!)

✅ **Controllers as Thin Adapters**:

- Controllers adapt HTTP → Application Layer (parse request, call use case)
- Controllers adapt Application Layer → HTTP (serialize DTO to JSON)
- No additional mapping needed when DTO shape = HTTP response shape
- This is a **valid DDD pattern** (Hexagonal Architecture adapter)

### Why This Is Good DDD (Not Just "OK for Startups")

**From Eric Evans / Martin Fowler:**

- DTOs exist to cross architectural boundaries ✅ (we do this)
- Application Layer should be independent of delivery mechanism ✅ (it is)
- Infrastructure should depend on Application, not vice versa ✅ (correct)
- Shared kernel is acceptable when bounded contexts align ✅ (monorepo, single app)

**From Hexagonal Architecture (Ports & Adapters):**

- Application Layer defines "ports" (interfaces/contracts) ✅ (`@semble/types`)
- Infrastructure provides "adapters" (controllers, API clients) ✅ (thin HTTP adapters)
- Multiple adapters can implement same port ✅ (backend controller, frontend client)
- This is the **textbook pattern**!

**When you'd need an additional mapping layer:**

1. **API Versioning**: Supporting v1 and v2 simultaneously
2. **Different Protocols**: REST + GraphQL + gRPC from same Application Layer
3. **Public API**: Need to hide internal structures
4. **Legacy Migration**: Gradual transition between representations

For a monorepo with single API version and private API, shared Application types are **architecturally sound**.

### Dependency Flow (Correct DDD)

```
┌─────────────────────────────────────────────────────┐
│ Domain Layer                                        │
│ - Entities (Collection, Card)                       │
│ - Value Objects (CollectionId, URL)                 │
│ - Domain Services                                   │
│ No dependencies ↓                                   │
└─────────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│ Application Layer (@semble/types)                   │
│ - Use Cases                                         │
│ - DTOs (Collection, GetCollectionsResponse)         │
│ - Defines contracts for external consumers          │
│ Depends on: Domain ↑                                │
└─────────────────────────────────────────────────────┘
           ↓                              ↓
┌──────────────────────┐      ┌──────────────────────┐
│ Infrastructure Layer │      │ Presentation Layer   │
│ - Controllers        │      │ - API Client         │
│ - HTTP Adapters      │      │ - Frontend           │
│ Depends on: App ↑    │      │ Depends on: App ↑    │
└──────────────────────┘      └──────────────────────┘
```

**Key point**: Frontend is a **client of the Application Layer**, not the Infrastructure Layer. It happens to communicate via HTTP, but it depends on the same Application contracts as the backend controllers.

### The Real Question: Are Your DTOs Well-Designed?

The quality of this architecture depends on whether your DTOs properly abstract the domain:

✅ **Good DTO Design** (what you have):

```typescript
// Domain: Rich model with behavior
class Collection {
  collectionId: CollectionId; // Value object
  name: CollectionName; // Value object with validation
  authorId: UserId; // Value object
  description?: CollectionDescription; // Value object
  cardIds: CardId[]; // List of value objects
  addCard(cardId: CardId) {
    /* logic */
  }
  removeCard(cardId: CardId) {
    /* logic */
  }
}

// DTO: Simple data structure for transfer
interface Collection {
  id: string; // Unwrapped value
  name: string; // Unwrapped value
  author: User; // Enriched relationship
  description?: string; // Unwrapped value
  cardCount: number; // Computed property
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}
```

This is **good separation**:

- Domain has rich behavior, validation, invariants
- DTO is simple, serializable, consumer-friendly
- Use Case does the mapping (proper layer responsibility)

❌ **Bad DTO Design** (anti-pattern):

```typescript
// Exposing domain internals
interface CollectionDTO {
  collectionId: CollectionId; // WRONG: exposing domain value object
  _aggregateVersion: number; // WRONG: exposing internal details
  domainEvents: DomainEvent[]; // WRONG: leaking domain events
}
```

### Summary: This IS Good DDD

- ✅ Domain → Application → Infrastructure (correct dependency flow)
- ✅ Use Cases map Domain → DTO (proper anti-corruption layer)
- ✅ DTOs abstract domain complexity (proper encapsulation)
- ✅ Multiple adapters consume same Application contract (Ports & Adapters)
- ✅ Shared Application types in monorepo (Shared Kernel pattern)

**This is not a compromise or shortcut** - it's a well-architected system following established DDD patterns. The key is that you're sharing **Application Layer types**, not Infrastructure types, and the dependency arrows point in the correct direction.

---

## Appendix: Example Migration

### Before: GetCollectionsForUrlUseCase

```typescript
// src/modules/cards/application/dtos/CollectionDTO.ts
export interface CollectionDTO {
  id: string;
  uri?: string;
  name: string;
  author: UserProfileDTO;
  description?: string;
  cardCount: number;
  createdAt: string;
  updatedAt: string;
}

// src/modules/cards/application/useCases/queries/GetCollectionsForUrlUseCase.ts
import { CollectionDTO, PaginationDTO, CollectionSortingDTO } from '../../dtos';

export interface GetCollectionsForUrlResult {
  collections: CollectionDTO[];
  pagination: PaginationDTO;
  sorting: CollectionSortingDTO;
}

export class GetCollectionsForUrlUseCase {
  async execute(query: GetCollectionsForUrlQuery): Promise<Result<GetCollectionsForUrlResult>> {
    // ... implementation
  }
}

// src/modules/cards/infrastructure/http/controllers/GetCollectionsForUrlController.ts
export class GetCollectionsForUrlController extends Controller {
  async executeImpl(req: Request, res: Response): Promise<any> {
    const { url } = req.query;
    if (!url || typeof url !== 'string') {
      return this.badRequest(res, 'URL query parameter is required');
    }

    const result = await this.useCase.execute({ url });
    if (result.isErr()) {
      return this.fail(res, result.error);
    }
    return this.ok(res, result.value);
  }
}

// src/webapp/api-client/types/responses.ts
export interface Collection {
  id: string;
  uri?: string;
  name: string;
  author: User;
  description?: string;
  cardCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface GetCollectionsForUrlResponse {
  collections: Collection[];
  pagination: Pagination;
  sorting: CollectionSorting;
}

// src/webapp/api-client/ApiClient.ts
import { GetCollectionsForUrlResponse } from './types';

async getCollectionsForUrl(params): Promise<GetCollectionsForUrlResponse> {
  // ...
}
```

### After: With Shared Types

```typescript
// src/types/src/api/responses.ts
export interface Collection {
  id: string;
  uri?: string;
  name: string;
  author: User;
  description?: string;
  cardCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface GetCollectionsForUrlResponse {
  collections: Collection[];
  pagination: Pagination;
  sorting: CollectionSorting;
}

// src/modules/cards/application/useCases/queries/GetCollectionsForUrlUseCase.ts
import { GetCollectionsForUrlResponse } from '@semble/types';

export class GetCollectionsForUrlUseCase {
  async execute(
    query: GetCollectionsForUrlQuery
  ): Promise<Result<GetCollectionsForUrlResponse>> {
    // ... implementation returns GetCollectionsForUrlResponse
  }
}

// src/modules/cards/infrastructure/http/controllers/GetCollectionsForUrlController.ts
import { z } from 'zod';
import {
  GetCollectionsForUrlParams,
  GetCollectionsForUrlResponse
} from '@semble/types';

const querySchema = z.object({
  url: z.string().min(1),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt', 'cardCount']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export class GetCollectionsForUrlController extends Controller {
  async executeImpl(req: Request, res: Response): Promise<any> {
    const validation = querySchema.safeParse(req.query);
    if (!validation.success) {
      return this.badRequest(res, validation.error.format());
    }

    const result = await this.useCase.execute({
      url: validation.data.url,
      page: validation.data.page,
      limit: validation.data.limit,
      sortBy: validation.data.sortBy as CollectionSortField | undefined,
      sortOrder: validation.data.sortOrder as SortOrder | undefined,
    });

    if (result.isErr()) {
      return this.fail(res, result.error);
    }

    return this.ok<GetCollectionsForUrlResponse>(res, result.value);
  }
}

// src/webapp/api-client/ApiClient.ts
import { GetCollectionsForUrlResponse } from '@semble/types';

async getCollectionsForUrl(params): Promise<GetCollectionsForUrlResponse> {
  // ...
}
```

### Key Changes

1. ✅ Single `Collection` type (not duplicated)
2. ✅ Single `GetCollectionsForUrlResponse` type
3. ✅ Controller validates with Zod schema
4. ✅ Use case returns shared type
5. ✅ Frontend imports same types
6. ✅ Full type safety from DB to UI

---

## Summary

This plan provides a **pragmatic, DDD-aligned approach** to sharing types between backend and frontend:

- **Uses npm workspaces** for proper dependency management
- **Adds Zod validation** at controller boundaries
- **Preserves domain-driven validation** patterns
- **Eliminates type duplication** while maintaining type safety
- **Stays simple** and avoids overengineering

The result is a **barebones but reliable** type system that:

- Catches errors at compile time
- Validates requests at runtime
- Maintains a single source of truth
- Scales as the codebase grows

Your engineer should be able to follow this plan step-by-step to implement the shared type system successfully.
