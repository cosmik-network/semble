---
description: >-
  This document provides a complete reference for Semble’s ATProto lexicons
  (data schemas).
---

# Semble Lexicon Reference

{% include "../../../.gitbook/includes/alpha-documentation-generat....md" %}

### Overview

Semble uses three primary lexicon collections in the `network.cosmik` namespace:

* **`network.cosmik.card`** - URL bookmarks and notes
* **`network.cosmik.collection`** - Named collections for organizing cards
* **`network.cosmik.collectionLink`** - Many-to-many links between cards and collections

### network.cosmik.card

Cards are the core record type in Semble, representing bookmarked URLs and associated notes.

#### Card Types

Cards come in two types, distinguished by the `type` field:

1. **URL Cards** (`type: "URL"`) - Bookmark a URL with metadata
2. **NOTE Cards** (`type: "NOTE"`) - Add notes to existing URL cards

#### URL Card Structure

```json
{
  "type": "URL",
  "$type": "network.cosmik.card",
  "content": {
    "url": "https://example.com/article",
    "$type": "network.cosmik.card#urlContent",
    "metadata": {
      "type": "article",
      "$type": "network.cosmik.card#urlMetadata",
      "title": "Example Article Title",
      "description": "Article description or excerpt...",
      "author": "Author Name",
      "siteName": "Example Site",
      "imageUrl": "https://example.com/image.jpg",
      "publishedDate": "2025-01-15T10:30:00.000Z",
      "retrievedAt": "2025-01-15T12:00:00.000Z"
    }
  },
  "createdAt": "2025-01-15T12:00:00.000Z",
  "provenance": {
    "via": {
      "uri": "at://did:plc:xxx/network.cosmik.card/zzz",
      "cid": "bafyrei..."
    },
    "$type": "network.cosmik.defs#provenance"
  }
}
```

**URL Card Fields**

| Field                            | Type   | Required | Description                                                        |
| -------------------------------- | ------ | -------- | ------------------------------------------------------------------ |
| `type`                           | string | Yes      | Always `"URL"` for URL cards                                       |
| `$type`                          | string | Yes      | Always `"network.cosmik.card"`                                     |
| `content`                        | object | Yes      | Contains the URL and metadata                                      |
| `content.url`                    | string | Yes      | The bookmarked URL                                                 |
| `content.$type`                  | string | Yes      | Always `"network.cosmik.card#urlContent"`                          |
| `content.metadata`               | object | No       | Fetched metadata about the URL                                     |
| `content.metadata.type`          | string | No       | Content type: `"video"`, `"article"`, `"image"`, `"website"`, etc. |
| `content.metadata.title`         | string | No       | Page or content title                                              |
| `content.metadata.description`   | string | No       | Page description or excerpt                                        |
| `content.metadata.author`        | string | No       | Content author                                                     |
| `content.metadata.siteName`      | string | No       | Website name                                                       |
| `content.metadata.imageUrl`      | string | No       | Preview image URL                                                  |
| `content.metadata.publishedDate` | string | No       | ISO 8601 datetime of original publication                          |
| `content.metadata.retrievedAt`   | string | No       | ISO 8601 datetime when metadata was fetched                        |
| `createdAt`                      | string | Yes      | ISO 8601 datetime when card was created                            |
| `provenance`                     | object | No       | Tracks how this card was discovered in the network                 |
| `provenance.via`                 | object | No       | Reference to the card from which this one was collected            |
| `provenance.via.uri`             | string | No       | AT-URI of the source card                                          |
| `provenance.via.cid`             | string | No       | Content ID of the source card                                      |
| `provenance.$type`               | string | No       | Always `"network.cosmik.defs#provenance"`                          |

{% hint style="info" %}
**Note:** The `provenance` field enables tracking how cards are discovered and shared across the network, supporting notifications when someone collects your card.&#x20;
{% endhint %}

#### NOTE Card Structure

NOTE cards attach textual notes to existing URL cards via a parent reference.

```json
{
  "type": "NOTE",
  "$type": "network.cosmik.card",
  "content": {
    "text": "My thoughts about this article...",
    "$type": "network.cosmik.card#noteContent"
  },
  "url": "https://example.com/article",
  "parentCard": {
    "uri": "at://did:plc:xxx/network.cosmik.card/yyy",
    "cid": "bafyrei..."
  },
  "createdAt": "2025-01-15T12:30:00.000Z"
}
```

**NOTE Card Fields**

| Field            | Type   | Required | Description                                                              |
| ---------------- | ------ | -------- | ------------------------------------------------------------------------ |
| `type`           | string | Yes      | Always `"NOTE"` for note cards                                           |
| `$type`          | string | Yes      | Always `"network.cosmik.card"`                                           |
| `content`        | object | Yes      | Contains the note text                                                   |
| `content.text`   | string | Yes      | The note content                                                         |
| `content.$type`  | string | Yes      | Always `"network.cosmik.card#noteContent"`                               |
| `url`            | string | No       | May contain the parent card's URL                                        |
| `parentCard`     | object | Yes      | Reference to the parent URL card                                         |
| `parentCard.uri` | string | Yes      | AT-URI of parent card (e.g., `at://did:plc:xxx/network.cosmik.card/yyy`) |
| `parentCard.cid` | string | Yes      | Content ID (CID) of parent card                                          |
| `createdAt`      | string | Yes      | ISO 8601 datetime when note was created                                  |

#### Design Notes

* **URL cards** store the primary bookmark and fetched metadata
* **NOTE cards** attach to URL cards via `parentCard` reference
* A URL card currently can only have a single NOTE card attached
* When displaying cards, NOTE cards should be shown attached to their parent URL card, not as separate items

***

### network.cosmik.collection

Collections are named groups for organizing cards.

#### Collection Structure

```json
{
  "$type": "network.cosmik.collection",
  "name": "AI Research",
  "description": "Articles and papers about artificial intelligence",
  "createdAt": "2025-01-15T12:00:00.000Z"
}
```

**Collection Fields**

| Field         | Type   | Required | Description                          |
| ------------- | ------ | -------- | ------------------------------------ |
| `$type`       | string | Yes      | Always `"network.cosmik.collection"` |
| `name`        | string | Yes      | Collection name                      |
| `description` | string | No       | Optional description                 |
| `createdAt`   | string | Yes      | ISO 8601 datetime when created       |

***

### network.cosmik.collectionLink

CollectionLinks establish many-to-many relationships between cards and collections.

#### CollectionLink Structure

```json
{
  "$type": "network.cosmik.collectionLink",
  "card": {
    "uri": "at://did:plc:xxx/network.cosmik.card/abc",
    "cid": "bafyrei..."
  },
  "collection": {
    "uri": "at://did:plc:xxx/network.cosmik.collection/def",
    "cid": "bafyrei..."
  },
  "createdAt": "2025-01-15T12:00:00.000Z"
}
```

**CollectionLink Fields**

| Field            | Type   | Required | Description                              |
| ---------------- | ------ | -------- | ---------------------------------------- |
| `$type`          | string | Yes      | Always `"network.cosmik.collectionLink"` |
| `card`           | object | Yes      | Reference to a card                      |
| `card.uri`       | string | Yes      | AT-URI of the card                       |
| `card.cid`       | string | Yes      | Content ID of the card                   |
| `collection`     | object | Yes      | Reference to a collection                |
| `collection.uri` | string | Yes      | AT-URI of the collection                 |
| `collection.cid` | string | Yes      | Content ID of the collection             |
| `createdAt`      | string | Yes      | ISO 8601 datetime when link was created  |

#### Design Notes

* **One card** can belong to **multiple collections** (many-to-many)
* **One collection** can contain **multiple cards**
* Links are stored as separate records, not embedded in cards or collections
* To find all cards in a collection, query for collectionLinks with matching `collection.uri`
* To find all collections for a card, query for collectionLinks with matching `card.uri`

***

### Working with References

ATProto uses **strong references** containing both URI and CID:

```javascript
{
  "uri": "at://did:plc:xxx/network.cosmik.card/yyy",
  "cid": "bafyreib4dj272r4cfzwp4hw47jote5ovy5b6j63ejm7wz44txp4pyobhkm"
}
```

* **URI**: Unique identifier in the format `at://[DID]/[collection]/[rkey]`
* **CID**: Content-addressed identifier ensuring data integrity

When building relationships (like collectionLinks or parentCard), you'll need to extract the URI from records and construct these reference objects.

***

### Exmple: Complete Card with Collection

Here's a complete example showing all record types working together:

**URL Card:**

```json
{
  "uri": "at://did:plc:user123/network.cosmik.card/card1",
  "cid": "bafyreiabc...",
  "value": {
    "type": "URL",
    "$type": "network.cosmik.card",
    "content": {
      "url": "https://example.com/ai-research",
      "$type": "network.cosmik.card#urlContent",
      "metadata": {
        "type": "article",
        "title": "The Future of AI",
        "description": "An exploration of AI trends...",
        "author": "Jane Doe"
      }
    },
    "createdAt": "2025-01-15T12:00:00.000Z"
  }
}
```

**NOTE Card (attached to above):**

```json
{
  "uri": "at://did:plc:user123/network.cosmik.card/note1",
  "cid": "bafyreidef...",
  "value": {
    "type": "NOTE",
    "$type": "network.cosmik.card",
    "content": {
      "text": "Interesting perspective on AGI timelines",
      "$type": "network.cosmik.card#noteContent"
    },
    "parentCard": {
      "uri": "at://did:plc:user123/network.cosmik.card/card1",
      "cid": "bafyreiabc..."
    },
    "createdAt": "2025-01-15T12:30:00.000Z"
  }
}
```

**Collection:**

```json
{
  "uri": "at://did:plc:user123/network.cosmik.collection/col1",
  "cid": "bafyreighi...",
  "value": {
    "$type": "network.cosmik.collection",
    "name": "AI Research",
    "description": "My AI reading list",
    "createdAt": "2025-01-10T10:00:00.000Z"
  }
}
```

**CollectionLink (linking card to collection):**

```json
{
  "uri": "at://did:plc:user123/network.cosmik.collectionLink/link1",
  "cid": "bafyreijkl...",
  "value": {
    "$type": "network.cosmik.collectionLink",
    "card": {
      "uri": "at://did:plc:user123/network.cosmik.card/card1",
      "cid": "bafyreiabc..."
    },
    "collection": {
      "uri": "at://did:plc:user123/network.cosmik.collection/col1",
      "cid": "bafyreighi..."
    },
    "createdAt": "2025-01-15T12:00:00.000Z"
  }
}
```
