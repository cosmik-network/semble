# Getting Started with the Semble PDS Client

{% hint style="warning" %}
We'll be shipping a more comprehensive API in the future. Meanwhile, this is a simple and lightweight PDS client working with Semble data directly on your PDS. Please share any feedback about bugs or ways to improve it (or feel free to make a PR directly to the package).&#x20;

**The `SemblePDSClient` node package covers all read and write operations needed for working with Semble data directly on your PDS.**

Also, you don’t have to use our PDS client (i.e. if you are using a different programming language). You are free to interact with Semble data in your PDS however you like. For example, changes made directly in [pdsls.dev](http://pdsls.dev/) will still reflect in Semble. If you make your own PDS clients for Semble data, we’d love to know about it, too!
{% endhint %}

#### Installation

```
npm install @cosmik.network/semble-pds-client
```

You can view the npm package [here](https://www.npmjs.com/package/@cosmik.network/semble-pds-client).

#### Usage

```tsx
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
const userCollectionsResult = await client.getCollections(
  'did:plc:example123',
  {
    limit: 20,
  },
);

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

