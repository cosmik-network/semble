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
  viaCard: someOtherCard, // Optional: reference to the card that led to this one
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

// Add card to collection with provenance tracking
const collectionLinkWithProvenance = await client.addCardToCollection(
  card,
  collection,
  viaCard, // Optional: reference to the card that led to this addition
);

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

// Get a specific card
const cardRecord = await client.getCard(card);

// Get a specific collection
const collectionRecord = await client.getCollection(collection);

// List your own cards with pagination
const myCardsResult = await client.getMyCards({
  limit: 50,
  cursor: 'optional-cursor',
  reverse: false,
});

// List your own collections with pagination
const myCollectionsResult = await client.getMyCollections({
  limit: 20,
});

// List cards for a specific user
const userCardsResult = await client.getCards('did:plc:example123', {
  limit: 50,
});

// List collections for a specific user
const userCollectionsResult = await client.getCollections('did:plc:example123', {
  limit: 20,
});

// Batch create multiple cards
const cardsResult = await client.createCards({
  cards: [
    { url: 'https://example1.com', note: 'First card' },
    { url: 'https://example2.com' },
    { url: 'https://example3.com', viaCard: someCard },
  ],
});

// Batch create multiple collections
const collectionsResult = await client.createCollections({
  collections: [
    { name: 'Collection 1', description: 'First collection' },
    { name: 'Collection 2' },
  ],
});

// Batch add multiple cards to a collection
const linksResult = await client.addCardsToCollection({
  collection: myCollection,
  cards: [card1, card2, card3],
  viaCard: someCard, // Optional: applies to all cards being added
});
```

## API

### `SemblePDSClient`

#### Constructor

- `new SemblePDSClient(options)` - Create a new client instance
  - `options.service` - PDS service URL
  - `options.env` - Optional environment string that gets appended to the NSID (e.g. `network.cosmik.{env}.*`)

#### Methods

- `login(identifier, password)` - Authenticate with app password
- `createCard(options)` - Create a URL card with automatic metadata fetching and optional provenance tracking
- `addNoteToCard(parentCard, noteText)` - Add a note card to an existing card
- `createCollection(options)` - Create a new collection (defaults to CLOSED access)
- `addCardToCollection(card, collection, viaCard?)` - Link a card to a collection with optional provenance tracking
- `updateNote(noteRef, updatedText)` - Update an existing note card
- `deleteCard(cardRef)` - Delete a card
- `updateCollection(collectionRef, name, description?)` - Update collection details
- `deleteCollection(collectionRef)` - Delete a collection
- `removeCardFromCollection(collectionLinkRef)` - Remove a card from a collection
- `getCard(cardRef)` - Get a specific card record
- `getCollection(collectionRef)` - Get a specific collection record
- `getMyCards(params?)` - List your own cards with optional pagination parameters
- `getMyCollections(params?)` - List your own collections with optional pagination parameters
- `getCards(did, params?)` - List cards for a specific user with optional pagination parameters
- `getCollections(did, params?)` - List collections for a specific user with optional pagination parameters
- `createCards(options)` - Batch create multiple cards using applyWrites
- `createCollections(options)` - Batch create multiple collections using applyWrites
- `addCardsToCollection(options)` - Batch add multiple cards to a collection using applyWrites

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
  viaCard?: StrongRef; // Optional reference to the card that led to this one
}
```

### `CreateCollectionOptions`

```typescript
interface CreateCollectionOptions {
  name: string;
  description?: string;
}
```

### `ListQueryParams`

```typescript
interface ListQueryParams {
  limit?: number;
  cursor?: string;
  reverse?: boolean;
}
```

### `CardRecord`

```typescript
interface CardRecord {
  uri: string;
  cid: string;
  value: {
    $type: string;
    type: 'URL' | 'NOTE';
    content: any;
    url?: string;
    parentCard?: StrongRef;
    createdAt: string;
    originalCard?: StrongRef;
    provenance?: {
      $type: string;
      via?: StrongRef;
    };
  };
}
```

### `CollectionRecord`

```typescript
interface CollectionRecord {
  uri: string;
  cid: string;
  value: {
    $type: string;
    name: string;
    description?: string;
    accessType: 'OPEN' | 'CLOSED';
    collaborators?: string[];
    createdAt: string;
    updatedAt: string;
  };
}
```

### `GetCardsResult` / `GetCollectionsResult`

```typescript
interface GetCardsResult {
  cursor?: string;
  records: CardRecord[];
}

interface GetCollectionsResult {
  cursor?: string;
  records: CollectionRecord[];
}
```

### `CreateCardsOptions`

```typescript
interface CreateCardsOptions {
  cards: CreateCardOptions[];
}
```

### `CreateCollectionsOptions`

```typescript
interface CreateCollectionsOptions {
  collections: CreateCollectionOptions[];
}
```

### `AddCardsToCollectionOptions`

```typescript
interface AddCardsToCollectionOptions {
  collection: StrongRef;
  cards: StrongRef[];
  viaCard?: StrongRef;
}
```

### `BatchCreateResult`

```typescript
interface BatchCreateResult {
  results: StrongRef[];
}
```

## Provenance Tracking

The client supports provenance tracking through the optional `viaCard` parameter in `createCard()` and `addCardToCollection()`. When provided, this creates a provenance record that tracks which card led to the creation of a new card or the addition of a card to a collection.

This is useful for tracking how content spreads through the network - for example, if someone discovers a URL through another person's card and saves it themselves, or adds it to their own collection.

The provenance information is stored in the record's `provenance.via` field as a strong reference to the originating card.

## License

MIT
