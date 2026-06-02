# Error Handling Strategy using Result<T, E>

This document outlines how the `Result<T, E>` type (`Ok<T, E> | Err<T, E>`) from `src/shared/core/Result.ts` should be used for error handling across the different layers of the application, following DDD and layered architecture best practices.

## Core Principle

The `Result` type should be used for operations that can **predictably fail** due to invalid input, violated business rules, unavailable resources, or external system issues. It makes potential failures explicit in the function signature and forces the caller to handle both success (`Ok`) and failure (`Err`) paths, improving robustness and clarity.

**Avoid using `Result` for:**

- Truly exceptional, unrecoverable system errors (e.g., out of memory, critical infrastructure failure). Standard exceptions might be more appropriate here, potentially caught at a high-level boundary.
- Flow control that isn't related to a success/failure outcome.

## Usage by Layer

### 1. Domain Layer (`src/<context>/domain/`)

- **Purpose:** Handles failures related to **business rule validation** and **invariant enforcement**.
- **Where:**
  - **Static factory methods (`create`) for Value Objects and Entities:** These methods are the primary place to enforce invariants. If creation fails due to invalid input or violated rules, return an `Err`.
  - **Domain Services:** Methods within domain services that perform complex operations or validations involving multiple domain objects might return a `Result`.
  - **Aggregate Root methods:** Methods that change the state of an aggregate might return a `Result` if the change could violate an invariant based on the provided input or current state.
- **Error Type (`E`):** Use specific, fine-grained **domain error classes** derived from a base `DomainError` or similar. Examples: `InvalidEmailError`, `OrderCannotBeCancelledError`, `InsufficientStockError`. These errors convey specific business meaning.
- **Example:**

  ```typescript
  // src/modules/annotations/domain/value-objects/AnnotationNote.ts
  import { ValueObject } from '../../../../shared/domain/ValueObject';
  import { Result, ok, err } from '../../../../shared/core/Result';

  export class InvalidNoteError extends Error {
    /* ... */
  } // Specific Domain Error

  export class AnnotationNote extends ValueObject<{ value: string }> {
    public static readonly MAX_LENGTH = 1000;

    getValue(): string {
      return this.props.value;
    }

    private constructor(props: { value: string }) {
      super(props);
    }

    public static create(
      value: string,
    ): Result<AnnotationNote, InvalidNoteError> {
      if (value.length > this.MAX_LENGTH) {
        return err(
          new InvalidNoteError(
            `Note exceeds maximum length of ${this.MAX_LENGTH}`,
          ),
        );
      }
      return ok(new AnnotationNote({ value }));
    }
  }
  ```

### 2. Application Layer (`src/<context>/application/`)

- **Purpose:** Handles failures related to **use case orchestration**, **authorization**, finding resources, and mapping errors from lower layers.
- **Where:**
  - **Use Case `execute` methods:** The primary return type for use cases should be `Promise<Result<T, UseCaseError>>`. `T` is the successful output (often a DTO or `void`), and `UseCaseError` is a more general application-level error.
  - **Application Services:** Similar to use cases, services coordinating tasks return `Result`.
- **Error Handling:**
  - Use cases call domain methods and infrastructure repositories/services that return `Result`.
  - They **must** check the result of each call (`isOk()` / `isErr()`).
  - If a lower layer returns an `Err`, the use case might:
    - Return the error directly if it's already a suitable `UseCaseError`.
    - **Map** the specific domain or infrastructure error to a more general `UseCaseError` (e.g., map `InvalidNoteError` to `ValidationError`, map `DatabaseConnectionError` to `AppError.UnexpectedError`).
    - Perform compensating actions if necessary.
  - Use `combine` from `Result.ts` when multiple independent operations must all succeed.
- **Error Type (`E`):** Use general **application/use case error classes** derived from `UseCaseError` (`src/shared/core/UseCaseError.ts`). Examples:
  - `ValidationError`: Input failed validation.
  - `ResourceNotFoundError`: A required entity (e.g., User, Annotation) wasn't found.
  - `PermissionDeniedError`: User is not authorized.
  - `AppError.UnexpectedError`: Wraps unexpected errors caught from lower layers or unforeseen exceptions.

  **Note:** `UseCaseError` is an abstract class that only provides a `message` property. Derived error classes should not set `this.name` as it's not part of the base class interface.

- **Example:**

  ```typescript
  // src/modules/annotations/application/use-cases/CreateAnnotationUseCase.ts
  import { UseCase } from '../../../../shared/core/UseCase';
  import { Result, ok, err } from '../../../../shared/core/Result';
  import { UseCaseError } from '../../../../shared/core/UseCaseError';
  import { AppError } from '../../../../shared/core/AppError';
  import { IAnnotationRepository } from '../repositories/IAnnotationRepository';
  import { Annotation } from '../../domain/aggregates/Annotation';
  import {
    AnnotationNote,
    InvalidNoteError,
  } from '../../domain/value-objects/AnnotationNote';
  // ... other imports

  export class ValidationError extends UseCaseError {
    constructor(message: string) {
      super(message);
    }
  }
  export class CreateAnnotationUseCase implements UseCase<
    InputDTO,
    Result<void, ValidationError | AppError.UnexpectedError>
  > {
    constructor(private repo: IAnnotationRepository) {}

    async execute(
      request: InputDTO,
    ): Promise<Result<void, ValidationError | AppError.UnexpectedError>> {
      try {
        const noteResult = AnnotationNote.create(request.note);
        if (noteResult.isErr()) {
          // Map DomainError to UseCaseError
          return err(new ValidationError(noteResult.error.message));
        }

        // ... create other value objects, potentially returning err(...) on failure ...

        const annotation = Annotation.create({
          /* ..., note: noteResult.value, ... */
        }); // Assuming Annotation.create doesn't return Result here

        const saveResult = await this.repo.save(annotation); // Assuming repo.save returns Result<void, InfrastructureError>
        if (saveResult.isErr()) {
          // Wrap InfrastructureError in UnexpectedError
          return err(AppError.UnexpectedError.create(saveResult.error));
        }

        return ok(undefined); // Success (void)
      } catch (e) {
        // Catch any truly unexpected exceptions
        return err(AppError.UnexpectedError.create(e));
      }
    }
  }
  ```

### 3. Infrastructure Layer (`src/<context>/infrastructure/`)

- **Purpose:** Handles failures related to **technical concerns** like database access, network communication, external API calls, file system operations, etc.
- **Where:**
  - **Repository implementations:** Methods like `findById`, `save`, `delete` should return `Promise<Result<T | null, InfrastructureError>>` or `Promise<Result<void, InfrastructureError>>`.
  - **External service clients/adapters:** Adapters interacting with third-party APIs or message queues.
  - **Publishers:** Implementations of `IPublisher` interfaces.
- **Error Handling:**
  - Catch exceptions thrown by underlying libraries (e.g., database drivers, HTTP clients, SDKs).
  - Wrap these exceptions into specific `InfrastructureError` types and return them as `Err`.
  - Do **not** let raw library exceptions leak upwards.
- **Error Type (`E`):** Use specific **infrastructure error classes** derived from a base `InfrastructureError` or similar. Examples: `DatabaseError`, `NetworkError`, `ApiUnavailableError`, `FileSystemError`.
- **Example:**

  ```typescript
  // src/modules/annotations/infrastructure/persistence/repositories/DrizzleAnnotationRepository.ts
  import { IAnnotationRepository } from '../../../application/repositories/IAnnotationRepository';
  import { Result, ok, err } from '../../../../../shared/core/Result';
  import { Annotation } from '../../../domain/aggregates/Annotation';
  import { TID } from '../../../../../atproto/domain/value-objects/TID';
  // ... other imports

  export class DatabaseError extends Error {
    constructor(message: string, cause?: Error) {
      super(message);
      this.cause = cause;
    }
  } // Infrastructure Error

  export class DrizzleAnnotationRepository implements IAnnotationRepository {
    // ... constructor ...

    async findById(id: TID): Promise<Result<Annotation | null, DatabaseError>> {
      try {
        const dbResult = await this.db.query.annotationsTable.findFirst({
          where: eq(schema.annotationsTable.id, id.toString()),
        });
        if (!dbResult) {
          return ok(null); // Found nothing, but not an error
        }
        const annotation = AnnotationMapper.toDomain(dbResult); // Assuming a mapper
        return ok(annotation);
      } catch (e) {
        console.error('Database error in findById:', e);
        return err(
          new DatabaseError(
            'Failed to query annotation by ID',
            e instanceof Error ? e : undefined,
          ),
        );
      }
    }

    async save(annotation: Annotation): Promise<Result<void, DatabaseError>> {
      try {
        const persistenceModel = AnnotationMapper.toPersistence(annotation);
        // ... perform drizzle insert/update ...
        await this.db
          .insert(schema.annotationsTable)
          .values(persistenceModel)
          .onConflictDoUpdate(/* ... */);
        return ok(undefined);
      } catch (e) {
        console.error('Database error saving annotation:', e);
        return err(
          new DatabaseError(
            'Failed to save annotation',
            e instanceof Error ? e : undefined,
          ),
        );
      }
    }
    // ... other methods ...
  }
  ```

## Error Handling Flow Summary

1.  **Infrastructure:** Catches technical exceptions -> Wraps in `InfrastructureError` -> Returns `Err`.
2.  **Application (Use Case):** Calls Infra/Domain -> Checks `Result` -> If `Err`, maps to `UseCaseError` (or `AppError.UnexpectedError`) -> Returns `Err`.
3.  **Presentation (e.g., API Controller):** Calls Use Case -> Checks `Result` -> If `Ok`, maps value to success response (e.g., 200 OK) -> If `Err`, maps `UseCaseError` to appropriate error response (e.g., 400 Bad Request, 404 Not Found, 500 Internal Server Error).

This layered approach ensures that errors are handled appropriately at each level, preventing low-level details from leaking upwards and providing meaningful error information to the caller at each boundary.
