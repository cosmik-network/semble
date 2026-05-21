## Option B: Introduce Zod + ts-rest (Medium Migration, Best Long-Term DX)

This is a bigger upfront investment but gives you **runtime validation** (a real gap in your current setup) and a contract that's the SDK itself — no codegen step needed after initial setup.

### Migration cost: Medium

- Migrate `@semble/types` interfaces → Zod schemas (they become the types _and_ validators)
- Define a ts-rest contract (replaces your hand-authored route registrations as the source of truth)
- Keep all use cases and repos untouched
- Controllers become thinner (ts-rest handles request parsing)

### Migrate `@semble/types` to Zod

```ts
// src/types/src/api/common.ts — before
export interface User {
  did: string;
  handle: string;
  displayName: string;
}

// After — Zod schema IS the type
import { z } from 'zod';

export const UserSchema = z.object({
  did: z.string(),
  handle: z.string(),
  displayName: z.string(),
});
export type User = z.infer<typeof UserSchema>; // identical to before for consumers
```

### Define the contract (this becomes `@semble/api`)

```ts
// packages/contract/src/index.ts
import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import {
  UserSchema,
  CardSchema,
  AddUrlToLibraryRequestSchema,
} from '@semble/types';

const c = initContract();

export const contract = c.router({
  cards: {
    addUrl: {
      method: 'POST',
      path: '/cards/add-url',
      body: AddUrlToLibraryRequestSchema,
      responses: { 200: CardSchema },
      summary: 'Add a URL to the library',
    },
    getMy: {
      method: 'GET',
      path: '/cards/my',
      query: z.object({ page: z.number(), limit: z.number() }),
      responses: {
        200: z.object({ cards: z.array(CardSchema), total: z.number() }),
      },
    },
  },
});
```

### Server implementation (fits your existing controller pattern)

```ts
// src/modules/cards/infrastructure/http/cardTsRestRouter.ts
import { createExpressEndpoints, initServer } from '@ts-rest/express';
import { contract } from '@semble/contract';

const s = initServer();

export const cardRouter = s.router(contract.cards, {
  addUrl: async ({ body, req }) => {
    const result = await addUrlController.execute(body, req.did);
    return { status: 200, body: result };
  },
  getMy: async ({ query, req }) => {
    const result = await getMyCardsController.execute(query, req.did);
    return { status: 200, body: result };
  },
});
```

### OpenAPI generation

```ts
import { generateOpenApi } from '@ts-rest/open-api';
import { contract } from '@semble/contract';

export const openApiDocument = generateOpenApi(contract, {
  info: { title: 'Semble API', version: '1.0.0' },
  components: {
    securitySchemes: {
      cookieAuth: { type: 'apiKey', in: 'cookie', name: 'accessToken' },
      apiKey: { type: 'apiKey', in: 'header', name: 'x-api-key' },
    },
  },
});
```

### The published SDK

```ts
// packages/sdk/src/index.ts — publish as @semble/api
import { initClient } from '@ts-rest/core';
import { contract } from '@semble/contract';

export function createSembleClient(apiKey: string) {
  return initClient(contract, {
    baseUrl: 'https://api.semble.so',
    baseHeaders: { 'x-api-key': apiKey },
  });
}

export function createBrowserClient() {
  return initClient(contract, {
    baseUrl: '/api',
    credentials: 'include',
  });
}
```

### What 3rd party devs get

```ts
import { createSembleClient } from '@semble/api';

const semble = createSembleClient('sk_live_abc123');

// Fully typed, RPC-style
const { body: card } = await semble.cards.addUrl({
  body: { url: 'https://example.com', note: 'Great article' },
});

const {
  body: { cards },
} = await semble.cards.getMy({
  query: { page: 1, limit: 20 },
});
```

Yes — Zod defines both. But the **depth of validation** differs between request and response, and there's a practical pattern for how to structure this in your codebase.

---

## The Core Pattern

```ts
import { z } from 'zod';

// ── Shared sub-schemas (reusable building blocks) ──────────────────────────
const CardSchema = z.object({
  id: z.string().uuid(),
  url: z.string().url(),
  title: z.string(),
  note: z.string().nullable(),
  createdAt: z.string().datetime(),
});

// ── Request schema — strict validation ────────────────────────────────────
const AddUrlToLibraryRequestSchema = z.object({
  url: z.string().url('Must be a valid URL'),
  note: z.string().max(500).optional(),
});

// ── Response schema — describes the shape ─────────────────────────────────
const AddUrlToLibraryResponseSchema = z.object({
  card: CardSchema,
});

// ── Types inferred automatically — no duplication ─────────────────────────
export type Card = z.infer<typeof CardSchema>;
export type AddUrlToLibraryRequest = z.infer<
  typeof AddUrlToLibraryRequestSchema
>;
export type AddUrlToLibraryResponse = z.infer<
  typeof AddUrlToLibraryResponseSchema
>;
```

Your existing `@semble/types` interfaces get **replaced** by these — the `z.infer<>` types are identical to what you had before, so the rest of your codebase (use cases, repos) doesn't need to change.

---

## Request vs Response — Different Validation Goals

|              | **Request schemas**                                              | **Response schemas**                   |
| ------------ | ---------------------------------------------------------------- | -------------------------------------- |
| Purpose      | Validate & reject bad input                                      | Describe shape for type safety + docs  |
| Validated by | ts-rest automatically (400 on fail)                              | Optional — `responseValidation: true`  |
| How strict   | Very — add `.min()`, `.max()`, `.url()`, `.email()`, refinements | Looser — just needs to match the shape |
| Who benefits | Your server (safety)                                             | SDK consumers (types + autocomplete)   |

---

## Where to Put Them — Fits Your Existing Structure

Given your `@semble/types` package, the cleanest migration is to turn it into a **Zod-first schemas package**:

```
packages/
└── types/                        ← rename to @semble/schemas or keep as @semble/types
    └── src/
        ├── entities/
        │   ├── card.ts           ← CardSchema, z.infer types
        │   └── user.ts           ← UserSchema, z.infer types
        ├── api/
        │   ├── cards/
        │   │   ├── addUrl.ts     ← request + response schemas per endpoint
        │   │   └── getMy.ts
        │   └── users/
        │       └── getProfile.ts
        └── index.ts              ← re-exports everything
```

```ts
// packages/types/src/api/cards/addUrl.ts
import { z } from 'zod';
import { CardSchema } from '../../entities/card';

export const AddUrlToLibraryRequestSchema = z.object({
  url: z.string().url('Must be a valid URL'),
  note: z.string().max(500).optional(),
});

export const AddUrlToLibraryResponseSchema = z.object({
  card: CardSchema,
});

// Types are free — inferred from schemas
export type AddUrlToLibraryRequest = z.infer<
  typeof AddUrlToLibraryRequestSchema
>;
export type AddUrlToLibraryResponse = z.infer<
  typeof AddUrlToLibraryResponseSchema
>;
```

Then the contract just imports and wires them:

```ts
// packages/contract/src/index.ts
import { initContract } from '@ts-rest/core';
import {
  AddUrlToLibraryRequestSchema,
  AddUrlToLibraryResponseSchema,
} from '@semble/types';

const c = initContract();

export const contract = c.router({
  cards: {
    addUrl: {
      method: 'POST',
      path: '/cards/add-url',
      body: AddUrlToLibraryRequestSchema, // ← Zod schema
      responses: {
        200: AddUrlToLibraryResponseSchema, // ← Zod schema
        400: z.object({ message: z.string() }), // ← document error shapes too
      },
    },
  },
});
```

---

## One Practical Tip — `z.null()` vs `.nullable()` for Responses

For response schemas, be deliberate about nullability — it flows directly into the SDK types your consumers see:

```ts
// This tells consumers the field can be null — they must handle it
note: z.string().nullable(); // → type: string | null

// This tells consumers the field may be absent entirely
note: z.string().optional(); // → type: string | undefined

// Both
note: z.string().nullish(); // → type: string | null | undefined
```

This is especially important for your response schemas since they become the TypeScript types in `@semble/api` — getting nullability right here saves your SDK consumers from runtime surprises.
