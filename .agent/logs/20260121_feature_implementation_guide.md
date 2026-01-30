# Feature Implementation Guide - Vertical Slice Pattern

This guide outlines the standard pattern for implementing a complete feature in the Semble codebase, following a vertical slice architecture from API client to database.

## Overview

Each feature follows a consistent layered architecture:

- **API Client** - TypeScript types and client methods
- **HTTP Layer** - Controllers and routes
- **Application Layer** - Use cases (business logic)
- **Domain Layer** - Entities, value objects, and domain services
- **Infrastructure Layer** - Repositories, external services, and persistence

## Implementation Steps

### 1. Define Types (`src/types/src/api/`)

Start by defining the request/response types that will be used across the API:

**Request Types** (`requests.ts`):

```typescript
export interface MyFeatureRequest {
  param1: string;
  param2?: number;
}
```

**Response Types** (`responses.ts`):

```typescript
export interface MyFeatureResponse {
  id: string;
  result: string;
}
```

### 2. Create Use Case (`src/modules/{module}/application/useCases/`)

Implement the business logic in a use case class:

```typescript
export class MyFeatureUseCase extends BaseUseCase<
  MyFeatureDTO,
  Result<MyFeatureResponseDTO, ValidationError | AppError.UnexpectedError>
> {
  constructor(
    private repository: IMyRepository,
    private domainService: MyDomainService,
    eventPublisher: IEventPublisher,
  ) {
    super(eventPublisher);
  }

  async execute(request: MyFeatureDTO): Promise<Result<...>> {
    // Business logic implementation
  }
}
```

### 3. Create Controller (`src/modules/{module}/infrastructure/http/controllers/`)

Handle HTTP requests and delegate to use cases:

```typescript
export class MyFeatureController extends Controller {
  constructor(private useCase: MyFeatureUseCase) {
    super();
  }

  async executeImpl(req: AuthenticatedRequest, res: Response): Promise<any> {
    const result = await this.useCase.execute(req.body);

    if (result.isErr()) {
      return this.fail(res, result.error);
    }

    return this.ok(res, result.value);
  }
}
```

### 4. Add Route (`src/modules/{module}/infrastructure/http/routes/`)

Define the HTTP endpoint:

```typescript
router.post('/my-feature', authMiddleware.ensureAuthenticated(), (req, res) =>
  myFeatureController.execute(req, res),
);
```

### 5. Wire Dependencies (`src/shared/infrastructure/http/factories/`)

**UseCaseFactory.ts** - Add use case instantiation:

```typescript
myFeatureUseCase: new MyFeatureUseCase(
  repositories.myRepository,
  services.myDomainService,
  services.eventPublisher,
),
```

**ControllerFactory.ts** - Add controller instantiation:

```typescript
myFeatureController: new MyFeatureController(
  useCases.myFeatureUseCase,
),
```

### 6. Add API Client Method (`src/webapp/api-client/`)

**Client Class** (`clients/MyClient.ts`):

```typescript
export class MyClient extends BaseClient {
  async myFeature(request: MyFeatureRequest): Promise<MyFeatureResponse> {
    return this.request<MyFeatureResponse>('POST', '/api/my-feature', request);
  }
}
```

**Main API Client** (`ApiClient.ts`):

```typescript
async myFeature(request: MyFeatureRequest): Promise<MyFeatureResponse> {
  return this.myClient.myFeature(request);
}
```

## Key Patterns

### Repository Pattern

- Interface in domain layer (`src/modules/{module}/domain/`)
- Implementation in infrastructure layer (`src/modules/{module}/infrastructure/repositories/`)
- Both real (Drizzle) and in-memory test implementations

### Domain Services

- Business logic that doesn't belong to a single entity
- Located in `src/modules/{module}/domain/services/`
- Injected into use cases

### Value Objects

- Immutable objects representing domain concepts
- Located in `src/modules/{module}/domain/value-objects/`
- Include validation logic

### Error Handling

- Use `Result<T, E>` pattern for error handling
- Custom error types extend `UseCaseError`
- Controllers handle different error types appropriately

### Authentication

- Use `AuthMiddleware.ensureAuthenticated()` for protected routes
- Use `AuthMiddleware.optionalAuth()` for routes that work with/without auth
- Access user DID via `req.did` in controllers

### Event Publishing

- Use cases extend `BaseUseCase` for event publishing
- Call `this.publishEventsForAggregate(entity)` after operations
- Events are handled by separate worker processes

## File Structure Example

For a feature called "MyFeature" in the "cards" module:

```
src/
├── types/src/api/
│   ├── requests.ts (add MyFeatureRequest)
│   └── responses.ts (add MyFeatureResponse)
├── modules/cards/
│   ├── domain/
│   │   ├── IMyRepository.ts
│   │   ├── services/MyDomainService.ts
│   │   └── value-objects/MyValueObject.ts
│   ├── application/useCases/
│   │   └── commands/MyFeatureUseCase.ts
│   └── infrastructure/
│       ├── repositories/DrizzleMyRepository.ts
│       └── http/
│           ├── controllers/MyFeatureController.ts
│           └── routes/ (update existing route file)
├── shared/infrastructure/http/factories/
│   ├── UseCaseFactory.ts (add use case)
│   ├── ControllerFactory.ts (add controller)
│   └── RepositoryFactory.ts (add repository)
└── webapp/api-client/
    ├── clients/MyClient.ts
    └── ApiClient.ts (add method)
```

## Testing Strategy

- **Unit Tests**: Test use cases and domain services in isolation
- **Integration Tests**: Test controllers with real dependencies
- **In-Memory Implementations**: Use for testing and development
- **Mock Services**: Use `Fake*` implementations for external dependencies

## Configuration

- Use `EnvironmentConfigService` for environment-specific settings
- Support both mock and real implementations via config flags
- Factory pattern allows switching implementations based on environment

This pattern ensures consistency, testability, and maintainability across all features in the codebase.
