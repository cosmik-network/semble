# @cosmik.network/semble-pds-client

A lightweight PDS client and AtpAgent wrapper for creating Semble records (Cards, Collections, CollectionLinks) directly to your PDS.

## Installation

```bash
npm install @cosmik.network/semble-pds-client
```

## Usage

```typescript
import { SemblePDSClient } from '@cosmik.network/semble-pds-client';

const client = new SemblePDSClient({
  service: 'https://bsky.social', // or your PDS URL
  env: 'dev', // optional: appends to NSID (e.g. network.cosmik.dev.*), usually only used for testing purposes
});

// Login with app password
await client.login('your-handle.bsky.social', 'your-app-password');

// Create a URL card
const card = await client.createCard({
  url: 'https://example.com',
  note: 'Optional note about this URL',
});

// Add a note to an existing card
const noteCard = await client.addNoteToCard(card, 'This is my note');

// Create a collection
const collection = await client.createCollection({
  name: 'My Collection',
  description: 'Optional description',
});

// Add card to collection
const collectionLink = await client.addCardToCollection(card, collection);

// Update a note
await client.updateNote(noteCard, 'Updated note text');

// Delete a card
await client.deleteCard(card);

// Update collection
await client.updateCollection(collection, 'New Name', 'New description');

// Delete collection
await client.deleteCollection(collection);

// Remove card from collection
await client.removeCardFromCollection(collectionLink);
```

## API

### `SemblePDSClient`

#### Constructor

- `new SemblePDSClient(options)` - Create a new client instance
  - `options.service` - PDS service URL
  - `options.env` - Optional environment string that gets appended to the NSID (e.g. `network.cosmik.{env}.*`)

#### Methods

- `login(identifier, password)` - Authenticate with app password
- `createCard(options)` - Create a URL card with automatic metadata fetching
- `addNoteToCard(parentCard, noteText)` - Add a note card to an existing card
- `createCollection(options)` - Create a new collection (defaults to CLOSED access)
- `addCardToCollection(card, collection)` - Link a card to a collection
- `updateNote(noteRef, updatedText)` - Update an existing note card
- `deleteCard(cardRef)` - Delete a card
- `updateCollection(collectionRef, name, description?)` - Update collection details
- `deleteCollection(collectionRef)` - Delete a collection
- `removeCardFromCollection(collectionLinkRef)` - Remove a card from a collection

## Types

### `StrongRef`

```typescript
interface StrongRef {
  uri: string;
  cid: string;
}
```

### `CreateCardOptions`

```typescript
interface CreateCardOptions {
  url: string;
  note?: string;
}
```

### `CreateCollectionOptions`

```typescript
interface CreateCollectionOptions {
  name: string;
  description?: string;
}
```

## License

MIT
