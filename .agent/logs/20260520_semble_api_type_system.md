# Prompt

```
@src/webapp/api-client/ApiClient.ts @src/webapp/api-client/ @src/types/src/api/requests.ts
@src/types/src/api/responses.ts @src/types/src/api/internal.ts @src/types/src/api/common.ts
@src/shared/infrastructure/http/app.ts @src/index.ts @src/modules/cards/infrastructure/http/routes/cardRoutes.ts
@src/shared/infrastructure/http/factories/ControllerFactory.ts
@src/modules/cards/infrastructure/http/controllers/AddUrlToLibraryController.ts @package.json create a markdown
doc at .agent/logs/20260520_semble_api_type_system.md which gives an overview of how we handle defining and
sharing types between the frontend and backend. Provide an overview of the ApiClient we use in the frontend and
the pattern for routes and controllers in the backend. Keep it terse and to the point. The goal with this doc is
to be able to then evaluate existing tools for automatically generating API docs and and api client
```

# Semble API Type System Overview

## Type Sharing: `@semble/types`

All API types live in the `src/types` workspace package, published internally as `@semble/types`. Both the backend (`src/`) and frontend (`src/webapp/`) import from this package — it is the single source of truth.

### Type Files

| File                             | Contents                                                                            |
| -------------------------------- | ----------------------------------------------------------------------------------- |
| `src/types/src/api/common.ts`    | Shared primitives: `User`, `Collection`, `Pagination`, `FeedPagination`, sort enums |
| `src/types/src/api/requests.ts`  | All request params/body shapes (query params, POST bodies)                          |
| `src/types/src/api/responses.ts` | All response shapes                                                                 |
| `src/types/src/api/internal.ts`  | Backend-only DTOs (re-exports from requests/responses with alias names)             |

Types are hand-authored TypeScript interfaces — no code generation, no OpenAPI schema. The contract between frontend and backend is enforced by shared imports, not a spec file.

---

## Frontend: API Client

### Structure

```
src/webapp/api-client/
  ApiClient.ts        # Facade — one method per endpoint, delegates to sub-clients
  clients/
    BaseClient.ts     # fetch wrapper: auth header injection, error handling
    QueryClient.ts    # All GET/read operations
    CardClient.ts     # Card mutation operations
    CollectionClient.ts
    ConnectionClient.ts
    FeedClient.ts
    NotificationClient.ts
    UserClient.ts
```

### `BaseClient`

- Wraps `fetch` with `Content-Type: application/json`
- Auth: sends `accessToken` cookie automatically (`credentials: 'include'`) for browser requests; for server-side (Next.js SSR), accepts an explicit token injected as a `Cookie` header
- Throws `ApiError` (with status code, code, details) on non-2xx responses

### `ApiClient`

- Thin facade that instantiates all sub-clients in its constructor and delegates every public method to the appropriate sub-client
- Exported as a singleton (`apiClient`) and via factory functions (`createApiClient()`, `createServerApiClient(accessToken)`)
- Re-exports everything from `@semble/types` for consumer convenience

### Usage Pattern

```ts
// Browser (uses cookie auth automatically)
const client = createApiClient();
const cards = await client.getMyUrlCards({ page: 1, limit: 20 });

// Server-side (SSR, inject token explicitly)
const client = createServerApiClient(accessToken);
const profile = await client.getMyProfile();
```

---

## Backend: Routes and Controllers

### Wiring

`app.ts` is the composition root. It:

1. Calls `RepositoryFactory`, `ServiceFactory`, `UseCaseFactory`, `ControllerFactory` to build the dependency tree
2. Creates Express routers per domain (cards, connections, graph, feeds, search, notifications, users)
3. Mounts them under `/api/*`, `/atproto/*`, etc.

### Route Pattern

Each domain has a `create*Routes(authMiddleware, ...controllers)` function that returns an Express `Router`. Routes are registered with either `authMiddleware.ensureAuthenticated()` or `authMiddleware.optionalAuth()`.

Example from `cardRoutes.ts`:

```ts
router.get('/my', authMiddleware.ensureAuthenticated(), (req, res) =>
  getMyUrlCardsController.execute(req, res),
);
```

### Controller Pattern

Controllers extend `Controller` (base class with helpers like `this.ok()`, `this.badRequest()`, `this.unauthorized()`). Each controller:

1. Receives one use case in its constructor
2. Implements `executeImpl(req, res)`: extracts params, calls use case, maps result to HTTP response
3. Use case returns a `Result<T, Error>` (neverthrow-style); controller maps `isErr()` to appropriate HTTP status

```ts
class AddUrlToLibraryController extends Controller {
  constructor(private useCase: AddUrlToLibraryUseCase) {
    super();
  }

  async executeImpl(req: AuthenticatedRequest, res: Response) {
    const { url, note, collectionIds } = req.body;
    const result = await this.useCase.execute({
      url,
      note,
      collectionIds,
      curatorId: req.did,
    });
    if (result.isErr()) return this.fail(res, result.error);
    return this.ok(res, result.value);
  }
}
```

### Factory Chain

```
ControllerFactory.create(useCases, cookieService, services, repos, appUrl, serviceDid)
  └── instantiates each Controller with its use case
UseCaseFactory.createForWebApp(repos, services)
  └── instantiates each UseCase with repos/services
```

---

## Key Gaps (relevant to API doc tooling evaluation)

- **No OpenAPI/Swagger spec** — types and routes are not annotated; a tool would need to parse TS types + Express route registrations
- **No runtime validation** — request bodies/params are not validated with zod or similar at the controller layer; type safety is compile-time only
- **Query params as GET search params, bodies as JSON POST** — standard REST, but not described anywhere machine-readable
- **Auth**: cookie-based (`accessToken` HttpOnly cookie); server-side SSR uses manual `Cookie` header injection
