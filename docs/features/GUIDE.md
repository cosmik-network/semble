# Feature Implementation Guide

This guide outlines the vertical slice approach for implementing features end-to-end in our DDD (Domain-Driven Design) and layered architecture system with Command Query Responsibility Segregation (CQRS).

## Architecture Overview

Our system follows a clean architecture pattern with the following layers:

- **Domain Layer**: Core business logic, entities, value objects, and domain services
- **Application Layer**: Use cases (commands and queries), DTOs, and application services
- **Infrastructure Layer**: Repositories, external services, and technical implementations
- **Presentation Layer**: HTTP controllers, routes, and API clients

## Command vs Query Pattern

We implement CQRS to separate read and write operations:

### Commands

- **Purpose**: Modify system state (Create, Update, Delete operations)
- **Example**: `AddUrlToLibraryUseCase`
- **Characteristics**:
  - Return success/failure results
  - May trigger domain events
  - Often involve business rule validation
  - Use domain services for complex operations

### Queries

- **Purpose**: Read data without side effects
- **Example**: `GetCollectionPageUseCase`
- **Characteristics**:
  - Return data transfer objects (DTOs)
  - Optimized for specific read scenarios
  - May aggregate data from multiple sources
  - Use query repositories for efficient data access

## Vertical Slice Implementation Steps

### 1. Domain Layer (if needed)

#### Domain Entities & Value Objects

- **Location**: `src/modules/{module}/domain/`
- **Files**: Entities, Value Objects, Domain Services
- **Example**: `Collection.ts`, `CardId.ts`, `URL.ts`

#### Domain Services

- **Location**: `src/modules/{module}/domain/services/`
- **Purpose**: Complex business logic that doesn't belong to a single entity
- **Example**: `CardLibraryService`, `CardCollectionService`

#### Repository Interfaces

- **Location**: `src/modules/{module}/domain/`
- **Files**:
  - `I{Entity}Repository.ts` - For command operations (write/modify state)
  - `I{Entity}QueryRepository.ts` - For query operations (read-only, optimized for specific views)
- **Example**: `ICardRepository.ts`, `ICardQueryRepository.ts`, `ICollectionRepository.ts`, `ICollectionQueryRepository.ts`

### 2. Application Layer

#### Use Cases

- **Location**: `src/modules/{module}/application/useCases/`
- **Structure**:
  - `commands/` - For state-changing operations
  - `queries/` - For read-only operations

#### Command Use Case Pattern

```typescript
// Example: AddUrlToLibraryUseCase
export interface AddUrlToLibraryDTO {
  url: string;
  note?: string;
  collectionIds?: string[];
  curatorId: string;
}

export class AddUrlToLibraryUseCase implements UseCase<
  AddUrlToLibraryDTO,
  Result<ResponseDTO>
> {
  constructor(
    private cardRepository: ICardRepository,
    private metadataService: IMetadataService,
    private cardLibraryService: CardLibraryService,
    private cardCollectionService: CardCollectionService,
  ) {}

  async execute(request: AddUrlToLibraryDTO): Promise<Result<ResponseDTO>> {
    // 1. Validate input
    // 2. Create/fetch domain entities
    // 3. Apply business rules via domain services
    // 4. Persist changes
    // 5. Return result
  }
}
```

#### Query Use Case Pattern

```typescript
// Example: GetCollectionPageUseCase
export interface GetCollectionPageQuery {
  collectionId: string;
  page?: number;
  limit?: number;
  sortBy?: CardSortField;
  sortOrder?: SortOrder;
}

export class GetCollectionPageUseCase implements UseCase<
  GetCollectionPageQuery,
  Result<GetCollectionPageResult>
> {
  constructor(
    private collectionRepo: ICollectionRepository,
    private cardQueryRepo: ICardQueryRepository,
    private profileService: IProfileService,
  ) {}

  async execute(
    query: GetCollectionPageQuery,
  ): Promise<Result<GetCollectionPageResult>> {
    // 1. Validate query parameters
    // 2. Fetch data from query repositories
    // 3. Aggregate and transform data
    // 4. Return structured result
  }
}
```

### 3. Infrastructure Layer

#### Repository Implementations

- **Location**: `src/modules/{module}/infrastructure/repositories/`
- **Files**:
  - `Drizzle{Entity}Repository.ts` - Implements command repository interface
  - `Drizzle{Entity}QueryRepository.ts` - Implements query repository interface with optimized read operations
- **Purpose**: Implement domain repository interfaces with specific technology (Drizzle ORM)
- **Pattern**: Query repositories often return DTOs optimized for specific views, while command repositories work with full domain entities

#### HTTP Controllers

- **Location**: `src/modules/{module}/infrastructure/http/controllers/`
- **Pattern**:

```typescript
export class {Feature}Controller extends Controller {
  constructor(private {feature}UseCase: {Feature}UseCase) {
    super();
  }

  async executeImpl(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      // 1. Extract and validate request data
      // 2. Call use case
      // 3. Handle result and return appropriate HTTP response
    } catch (error) {
      return this.fail(res, error);
    }
  }
}
```

#### Routes

- **Location**: `src/modules/{module}/infrastructure/http/routes/`
- **Purpose**: Define HTTP endpoints and wire controllers
- **Pattern**: Group related endpoints, apply middleware (auth, validation)

### 4. Dependency Injection & Factories

#### Factory Registration

All new components must be registered in the appropriate factories:

1. **RepositoryFactory** (`src/shared/infrastructure/http/factories/RepositoryFactory.ts`)
   - Register both command and query repository implementations

2. **ServiceFactory** (`src/shared/infrastructure/http/factories/ServiceFactory.ts`)
   - Register domain services and external services

3. **UseCaseFactory** (`src/shared/infrastructure/http/factories/UseCaseFactory.ts`)
   - Register use cases with their dependencies

4. **ControllerFactory** (`src/shared/infrastructure/http/factories/ControllerFactory.ts`)
   - Register controllers with their use cases

### 5. API Client Layer

#### Client Structure

- **Location**: `src/webapp/api-client/`
- **Files**:
  - `types/requests.ts` - Request DTOs
  - `types/responses.ts` - Response DTOs
  - `clients/{Module}Client.ts` - HTTP client implementations
  - `ApiClient.ts` - Main client facade

#### Client Pattern

```typescript
export class {Module}Client extends BaseClient {
  async {operation}(request: {Operation}Request): Promise<{Operation}Response> {
    return this.request<{Operation}Response>(
      'POST', // or appropriate HTTP method
      '/api/{endpoint}',
      request,
    );
  }
}
```

## Implementation Checklist

When implementing a new feature, follow this checklist:

### Domain Layer

- [ ] Create/update domain entities if needed
- [ ] Create/update value objects if needed
- [ ] Define command repository interfaces (for write operations)
- [ ] Define query repository interfaces (for read operations with specific DTOs)
- [ ] Implement domain services for complex business logic

### Application Layer

- [ ] Create use case (command or query)
- [ ] Define request/response DTOs
- [ ] Implement business logic and validation
- [ ] Handle error cases appropriately

### Infrastructure Layer

- [ ] Implement command repository (if new entity)
- [ ] Implement query repository (if new entity)
- [ ] Create HTTP controller
- [ ] Define routes
- [ ] Register in factories

### API Client Layer

- [ ] Define request/response types
- [ ] Implement client methods
- [ ] Update main ApiClient facade

### Integration

- [ ] Register all components in factories
- [ ] Wire routes in main app
- [ ] Test end-to-end flow

### Repository Pattern (CQRS)

- **Command Repositories**: Handle write operations, work with full domain entities, enforce business rules
- **Query Repositories**: Handle read operations, return optimized DTOs, support pagination and sorting
- **Separation**: Commands use `I{Entity}Repository`, queries use `I{Entity}QueryRepository`
- **DTOs**: Query repositories return view-specific DTOs (e.g., `UrlCardView`, `CollectionQueryResultDTO`)

## Key Patterns & Conventions

### Error Handling

- Use `Result<T, E>` pattern for use cases
- Define specific error types that extend `UseCaseError`
- Controllers handle errors and return appropriate HTTP status codes

### Validation

- Input validation in use cases using value objects
- Domain validation in entities and value objects
- HTTP validation in controllers

### Authentication

- Use `AuthenticatedRequest` for protected endpoints
- Extract user identity (`did`) from request
- Pass user context to use cases

### Pagination & Sorting

- Standardize pagination parameters (`page`, `limit`)
- Use enums for sort fields and order
- Return pagination metadata in responses

### Testing Strategy

- Unit tests for domain logic
- Integration tests for use cases
- In-memory implementations for testing
- Mock external services

## Common Pitfalls to Avoid

1. **Mixing Concerns**: Keep domain logic in domain layer, not in controllers or repositories
2. **Anemic Domain Model**: Ensure entities have behavior, not just data
3. **Repository Leakage**: Don't expose ORM-specific types in domain interfaces
4. **Missing Error Handling**: Always handle and propagate errors appropriately
5. **Inconsistent Patterns**: Follow established patterns for similar operations

## Example Files to Reference

### Command Example

- Use Case: `src/modules/cards/application/useCases/commands/AddUrlToLibraryUseCase.ts`
- Controller: `src/modules/cards/infrastructure/http/controllers/AddUrlToLibraryController.ts`

### Query Example

- Use Case: `src/modules/cards/application/useCases/queries/GetCollectionPageUseCase.ts`
- Controller: `src/modules/cards/infrastructure/http/controllers/GetCollectionPageController.ts`

### Repository Examples

- Command Repository Interface: `src/modules/cards/domain/ICardRepository.ts`
- Query Repository Interface: `src/modules/cards/domain/ICardQueryRepository.ts`
- Command Repository Implementation: `src/modules/cards/infrastructure/repositories/DrizzleCardRepository.ts`
- Query Repository Implementation: `src/modules/cards/infrastructure/repositories/DrizzleCardQueryRepository.ts`

### Factory Examples

- All factories in `src/shared/infrastructure/http/factories/`

This guide should be used as a reference when implementing new features to ensure consistency with the established architecture and patterns.

### example context:

```
docs/features/GUIDE.md
src/modules/cards/application/useCases/commands/AddUrlToLibraryUseCase.ts
src/modules/cards/domain/ICardQueryRepository.ts
src/modules/cards/domain/ICardRepository.ts
src/modules/cards/infrastructure/http/controllers/AddUrlToLibraryController.ts
src/modules/cards/infrastructure/http/routes/cardRoutes.ts
src/modules/cards/infrastructure/http/routes/collectionRoutes.ts
src/modules/user/infrastructure/http/routes/userRoutes.ts
src/shared/domain/AggregateRoot.ts
src/shared/domain/events/IDomainEvent.ts
src/shared/infrastructure/http/app.ts
src/shared/infrastructure/http/factories/ControllerFactory.ts
src/shared/infrastructure/http/factories/RepositoryFactory.ts
src/shared/infrastructure/http/factories/ServiceFactory.ts
src/shared/infrastructure/http/factories/UseCaseFactory.ts
src/modules/cards/domain/Card.ts
src/modules/cards/domain/events/CardAddedToLibraryEvent.ts
src/modules/cards/infrastructure/http/routes/index.ts
```
