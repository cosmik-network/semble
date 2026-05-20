# prototypey

A fully-featured sdk for developing lexicons with typescript.

Below this is the docs and features of the library. If you'd like the story for why prototypey exists and what it's good for: [that's published here](https://blog.tyler.fun/3m5a3do4eus2w)

## Features

- atproto spec lexicon authoring with in IDE docs & hints for each attribute (ts => json)
- CLI to generate json from ts definitions
- CLI to generate ts from json definitions
- inference of usage type from full lexicon definition
  - the really cool part of this is that it fills in the refs from the defs all at the type level
- `lx.lexicon(...).validate(data)` for validating data using `@atproto/lexicon`
- `fromJSON()` helper for creating lexicons directly from JSON objects with full type inference
- permission-set lexicon support with builders for all resource types (repo, rpc, blob, account, identity)

## Installation

```bash
pnpm install prototypey
```

## Usage

Prototypey provides both a TypeScript library for authoring lexicons and a CLI for code generation.

### Authoring Lexicons

**what you'll write:**

```ts
const lex = lx.lexicon('app.bsky.actor.profile', {
  main: lx.record({
    key: 'self',
    record: lx.object({
      displayName: lx.string({ maxLength: 64, maxGraphemes: 64 }),
      description: lx.string({ maxLength: 256, maxGraphemes: 256 }),
    }),
  }),
});
```

**generates to:**

```json
{
  "lexicon": 1,
  "id": "app.bsky.actor.profile",
  "defs": {
    "main": {
      "type": "record",
      "key": "self",
      "record": {
        "type": "object",
        "properties": {
          "displayName": {
            "type": "string",
            "maxLength": 64,
            "maxGraphemes": 64
          },
          "description": {
            "type": "string",
            "maxLength": 256,
            "maxGraphemes": 256
          }
        }
      }
    }
  }
}
```

you could also access the json definition with `lex.json()`.

### Permission Sets

You can define [permission-set lexicons](https://atproto.com/specs/permission), crucial for implementing OAuth in your app, using `lx.permissionSet()` and the permission entry builders.

Collections and endpoints accept both lexicon schema objects and plain NSID strings:

```ts
const authCore = lx.lexicon('com.example.authCore', {
  main: lx.permissionSet({
    // Offer translations with langString
    title: lx.langString('MyApp: Core functionality', {
      es: 'MyApp: Funciones centrales',
    }),
    // A string provides no translations
    detail: 'The core functionality for MyApp',
    permissions: [
      lx.repoPermission({
        collection: [myRecord, 'com.example.otherRecord'],
        action: ['create', 'update'],
      }),
      lx.blobPermission({
        accept: ['image/*'],
      }),
    ],
  }),
});
```

### Runtime Validation

Prototypey provides runtime validation using [@atproto/lexicon](https://npmx.dev/package/@atproto/lexicon):

```ts
const lex = lx.lexicon('app.bsky.actor.profile', {
  main: lx.record({
    key: 'self',
    record: lx.object({
      displayName: lx.string({ maxLength: 64, maxGraphemes: 64 }),
      description: lx.string({ maxLength: 256, maxGraphemes: 256 }),
    }),
  }),
});

// Validate data against the schema
const result = lex.validate({
  displayName: 'Alice',
  description: 'Software engineer',
});

if (result.success) {
  console.log('Valid data:', result.value);
} else {
  console.error('Validation error:', result.error);
}
```

**Validating against specific definitions:**

If your lexicon has multiple definitions, you can validate against a specific one:

```ts
const lex = lx.lexicon('app.bsky.feed.post', {
  user: lx.object({
    handle: lx.string({ required: true }),
    displayName: lx.string(),
  }),
  main: lx.record({
    key: 'tid',
    record: lx.object({
      text: lx.string({ required: true }),
      author: lx.ref('#user', { required: true }),
    }),
  }),
});

// Validate against the "user" definition
const userResult = lex.validate(
  { handle: 'alice.bsky.social', displayName: 'Alice' },
  'user',
);

// Validate against "main" (default if not specified)
const postResult = lex.validate({
  text: 'Hello world',
  author: { handle: 'bob.bsky.social' },
});
```

### CLI Commands

The `prototypey` package includes a CLI with two main commands:

#### `gen-emit` - Emit JSON schemas from TypeScript

```bash
prototypey gen-emit <outdir> <sources...>
```

Extracts JSON schemas from TypeScript lexicon definitions.

**Example:**

```bash
prototypey gen-emit ./lexicons ./src/lexicons/**/*.ts
```

#### `gen-from-json` - Generate TypeScript from JSON schemas

```bash
prototypey gen-from-json <outdir> <sources...>
```

Generates TypeScript files from JSON lexicon schemas using the `fromJSON` helper. This is useful when you have existing lexicon JSON files and want to work with them in TypeScript with full type inference.

**Example:**

```bash
prototypey gen-from-json ./src/lexicons ./lexicons/**/*.json
```

This will create TypeScript files that export typed lexicon objects:

```ts
// Generated file: src/lexicons/app.bsky.feed.post.ts
import { fromJSON } from 'prototypey';

export const appBskyFeedPost = fromJSON({
  // ... lexicon JSON
});
```

### Typical Workflows

#### TypeScript-first workflow

1. Author lexicons in TypeScript using the library
2. Emit JSON schemas with `gen-emit` for runtime validation

**Recommended:** Add as a script to your `package.json`:

```json
{
  "scripts": {
    "lexicon:emit": "prototypey gen-emit ./schemas ./src/lexicons/**/*.ts"
  }
}
```

Then run:

```bash
npm run lexicon:emit
```

#### JSON-first workflow

1. Start with JSON lexicon schemas (e.g., from atproto)
2. Generate TypeScript with `gen-from-json` for type-safe access

**Recommended:** Add as a script to your `package.json`:

```json
{
  "scripts": {
    "lexicon:import": "prototypey gen-from-json ./src/lexicons ./lexicons/**/*.json"
  }
}
```

Then run:

```bash
npm run lexicon:import
```

---

Please give any and all feedback. I've not really written many lexicons much myself yet, so this project is at a point of "well I think this makes sense". Both the [issues page](https://github.com/tylersayshi/prototypey/issues) and [discussions](https://github.com/tylersayshi/prototypey/discussions) are open and ready for y'all 🙂.

**Call For Contribution:**

We need library art! Please reach out if you'd be willing to contribute some drawings or anything :)

# lx.query

```typescript
/**
 * Creates a query endpoint definition (HTTP GET).
 * @see https://atproto.com/specs/lexicon#query
 */
query<T extends QueryOptions>(options?: T): T & {
type: "query";
};

/**
 * Query endpoint options (HTTP GET).
 * @see https://atproto.com/specs/lexicon#query
 */
type QueryOptions = {
  /** Human-readable description */
  description?: string;
  /** Query string parameters */
  parameters?: ParamsResult<ParamsProperties>;
  /** Response body schema */
  output?: BodySchema;
  /** Possible error responses */
  errors?: ErrorDef[];
};

/**
 * Resulting params schema with required fields extracted.
 * @see https://atproto.com/specs/lexicon#params
 */
type ParamsResult<T extends ParamsProperties> = {
  type: "params";
  /** Parameter definitions */
  properties: { [K in keyof T]: Omit<T[K], "required" | "nullable"> };
} & ([RequiredKeys<T>] extends [never] ? {} : {
  required: UnionToTuple<RequiredKeys<T>>;
});

/**
 * Map of parameter names to their lexicon item definitions.
 * @see https://atproto.com/specs/lexicon#params
 */
type ParamsProperties = Record<string, LexiconItem>;

type BodySchema = {
  /** MIME type encoding (typically "application/json") */
  encoding: "application/json" | (string & {});
  /** Human-readable description */
  description?: string;
  /** Object schema defining the body structure */
  schema?: ObjectResult<ObjectProperties>;
};

/**
 * Error definition for HTTP endpoints.
 * @see https://atproto.com/specs/lexicon#http-endpoints
 */
type ErrorDef = {
  /** Error name/code */
  name: string;
  /** Human-readable error description */
  description?: string;
};


/**
 * Base interface for all lexicon items.
 * @see https://atproto.com/specs/lexicon#overview-of-types
 */
type LexiconItem = LexiconItemCommonOptions & {
  type: LexiconType;
};

/**
 * Common options available for lexicon items.
 * @see https://atproto.com/specs/lexicon#string-formats
 */
type LexiconItemCommonOptions = {
  /** Indicates this field must be provided */
  required?: boolean;
  /** Indicates this field can be explicitly set to null */
  nullable?: boolean;
  /** Human-readable description */
  description?: string;
};

//#region core/lib.d.ts
/** @see https://atproto.com/specs/lexicon#overview-of-types */
type LexiconType = "null" | "boolean" | "integer" | "string" | "bytes" | "cid-link" | "blob" | "array" | "object" | "params" | "token" | "ref" | "union" | "unknown" | "record" | "query" | "procedure" | "subscription" | "permission-set";

```
