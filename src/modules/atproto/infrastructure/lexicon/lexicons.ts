/**
 * GENERATED CODE - DO NOT MODIFY
 */
import {
  type LexiconDoc,
  Lexicons,
  ValidationError,
  type ValidationResult,
} from '@atproto/lexicon'
import { type $Typed, is$typed, maybe$typed } from './util.js'

export const schemaDict = {
  NetworkCosmikCard: {
    lexicon: 1,
    id: 'network.cosmik.card',
    description: 'A single record type for all cards.',
    defs: {
      main: {
        type: 'record',
        description: 'A record representing a card with content.',
        key: 'tid',
        record: {
          type: 'object',
          required: ['type', 'content'],
          properties: {
            type: {
              type: 'string',
              description: 'The type of card',
              knownValues: ['URL', 'NOTE'],
            },
            content: {
              type: 'union',
              description:
                'The specific content of the card, determined by the card type.',
              refs: [
                'lex:network.cosmik.card#urlContent',
                'lex:network.cosmik.card#noteContent',
              ],
            },
            url: {
              type: 'string',
              format: 'uri',
              description:
                'Optional URL associated with the card. Required for URL cards, optional for NOTE cards.',
            },
            parentCard: {
              type: 'ref',
              description:
                'Optional strong reference to a parent card (for NOTE cards).',
              ref: 'lex:com.atproto.repo.strongRef',
            },
            createdAt: {
              type: 'string',
              format: 'datetime',
              description:
                'Timestamp when this card was created (usually set by PDS).',
            },
            originalCard: {
              type: 'ref',
              description:
                'Optional strong reference to the original card (for NOTE cards).',
              ref: 'lex:com.atproto.repo.strongRef',
            },
            provenance: {
              type: 'ref',
              description: 'Optional provenance information for this card.',
              ref: 'lex:network.cosmik.defs#provenance',
            },
          },
        },
      },
      urlContent: {
        type: 'object',
        description: 'Content structure for a URL card.',
        required: ['url'],
        properties: {
          url: {
            type: 'string',
            format: 'uri',
            description: 'The URL being saved',
          },
          metadata: {
            type: 'ref',
            ref: 'lex:network.cosmik.card#urlMetadata',
            description: 'Optional metadata about the URL',
          },
        },
      },
      noteContent: {
        type: 'object',
        description: 'Content structure for a note card.',
        required: ['text'],
        properties: {
          text: {
            type: 'string',
            description: 'The note text content',
            maxLength: 10000,
          },
        },
      },
      urlMetadata: {
        type: 'object',
        description: 'Metadata about a URL.',
        properties: {
          title: {
            type: 'string',
            description: 'Title of the page',
          },
          description: {
            type: 'string',
            description: 'Description of the page',
          },
          author: {
            type: 'string',
            description: 'Author of the content',
          },
          publishedDate: {
            type: 'string',
            format: 'datetime',
            description: 'When the content was published',
          },
          siteName: {
            type: 'string',
            description: 'Name of the site',
          },
          imageUrl: {
            type: 'string',
            format: 'uri',
            description: 'URL of a representative image',
          },
          type: {
            type: 'string',
            description: "Type of content (e.g., 'video', 'article')",
          },
          retrievedAt: {
            type: 'string',
            format: 'datetime',
            description: 'When the metadata was retrieved',
          },
          doi: {
            type: 'string',
            description: 'Digital Object Identifier (DOI) for academic content',
          },
          isbn: {
            type: 'string',
            description: 'International Standard Book Number (ISBN) for books',
          },
        },
      },
    },
  },
  NetworkCosmikCollection: {
    lexicon: 1,
    id: 'network.cosmik.collection',
    description: 'A single record type for collections of cards.',
    defs: {
      main: {
        type: 'record',
        description: 'A record representing a collection of cards.',
        key: 'tid',
        record: {
          type: 'object',
          required: ['name', 'accessType'],
          properties: {
            name: {
              type: 'string',
              description: 'Name of the collection',
              maxLength: 100,
            },
            description: {
              type: 'string',
              description: 'Description of the collection',
              maxLength: 500,
            },
            accessType: {
              type: 'string',
              description: 'Access control for the collection',
              knownValues: ['OPEN', 'CLOSED'],
            },
            collaborators: {
              type: 'array',
              description:
                'List of collaborator DIDs who can add cards to closed collections',
              items: {
                type: 'string',
                description: 'DID of a collaborator',
              },
            },
            createdAt: {
              type: 'string',
              format: 'datetime',
              description:
                'Timestamp when this collection was created (usually set by PDS).',
            },
            updatedAt: {
              type: 'string',
              format: 'datetime',
              description: 'Timestamp when this collection was last updated.',
            },
          },
        },
      },
    },
  },
  NetworkCosmikCollectionLink: {
    lexicon: 1,
    id: 'network.cosmik.collectionLink',
    description: 'A record that links a card to a collection.',
    defs: {
      main: {
        type: 'record',
        description:
          'A record representing the relationship between a card and a collection.',
        key: 'tid',
        record: {
          type: 'object',
          required: ['collection', 'card', 'addedBy', 'addedAt'],
          properties: {
            collection: {
              type: 'ref',
              description: 'Strong reference to the collection record.',
              ref: 'lex:com.atproto.repo.strongRef',
            },
            card: {
              type: 'ref',
              description:
                'Strong reference to the card record in the users library.',
              ref: 'lex:com.atproto.repo.strongRef',
            },
            originalCard: {
              type: 'ref',
              description:
                'Strong reference to the original card record (may be in another library).',
              ref: 'lex:com.atproto.repo.strongRef',
            },
            addedBy: {
              type: 'string',
              description:
                'DID of the user who added the card to the collection',
            },
            addedAt: {
              type: 'string',
              format: 'datetime',
              description:
                'Timestamp when the card was added to the collection.',
            },
            createdAt: {
              type: 'string',
              format: 'datetime',
              description:
                'Timestamp when this link record was created (usually set by PDS).',
            },
            provenance: {
              type: 'ref',
              description: 'Optional provenance information for this link.',
              ref: 'lex:network.cosmik.defs#provenance',
            },
          },
        },
      },
    },
  },
  NetworkCosmikCollectionLinkRemoval: {
    lexicon: 1,
    id: 'network.cosmik.collectionLinkRemoval',
    description:
      'A record indicating that a card was removed from a collection by the collection owner.',
    defs: {
      main: {
        type: 'record',
        description:
          "A record representing the removal of a collection link by a collection owner when they cannot delete the original link (which exists in another user's repository).",
        key: 'tid',
        record: {
          type: 'object',
          required: ['collection', 'removedLink', 'removedBy', 'removedAt'],
          properties: {
            collection: {
              type: 'ref',
              description: 'Strong reference to the collection record.',
              ref: 'lex:com.atproto.repo.strongRef',
            },
            removedLink: {
              type: 'ref',
              description:
                'Strong reference to the collectionLink record that is being removed.',
              ref: 'lex:com.atproto.repo.strongRef',
            },
            removedBy: {
              type: 'string',
              format: 'did',
              description:
                'DID of the user who removed the link (typically the collection owner).',
            },
            removedAt: {
              type: 'string',
              format: 'datetime',
              description:
                'Timestamp when the link was removed from the collection.',
            },
            reason: {
              type: 'string',
              maxLength: 300,
              description: 'Optional reason for the removal.',
            },
          },
        },
      },
    },
  },
  NetworkCosmikDefs: {
    lexicon: 1,
    id: 'network.cosmik.defs',
    description: 'Common definitions for annotation types and references',
    defs: {
      provenance: {
        type: 'object',
        description: 'Represents the provenance or source of a record.',
        properties: {
          via: {
            type: 'ref',
            description:
              'Strong reference to the card that led to this record.',
            ref: 'lex:com.atproto.repo.strongRef',
          },
        },
      },
    },
  },
  ComAtprotoRepoStrongRef: {
    lexicon: 1,
    id: 'com.atproto.repo.strongRef',
    description: 'A URI with a content-hash fingerprint.',
    defs: {
      main: {
        type: 'object',
        required: ['uri', 'cid'],
        properties: {
          cid: {
            type: 'string',
            format: 'cid',
          },
          uri: {
            type: 'string',
            format: 'at-uri',
          },
        },
      },
    },
  },
} as const satisfies Record<string, LexiconDoc>
export const schemas = Object.values(schemaDict) satisfies LexiconDoc[]
export const lexicons: Lexicons = new Lexicons(schemas)

export function validate<T extends { $type: string }>(
  v: unknown,
  id: string,
  hash: string,
  requiredType: true,
): ValidationResult<T>
export function validate<T extends { $type?: string }>(
  v: unknown,
  id: string,
  hash: string,
  requiredType?: false,
): ValidationResult<T>
export function validate(
  v: unknown,
  id: string,
  hash: string,
  requiredType?: boolean,
): ValidationResult {
  return (requiredType ? is$typed : maybe$typed)(v, id, hash)
    ? lexicons.validate(`${id}#${hash}`, v)
    : {
        success: false,
        error: new ValidationError(
          `Must be an object with "${hash === 'main' ? id : `${id}#${hash}`}" $type property`,
        ),
      }
}

export const ids = {
  NetworkCosmikCard: 'network.cosmik.card',
  NetworkCosmikCollection: 'network.cosmik.collection',
  NetworkCosmikCollectionLink: 'network.cosmik.collectionLink',
  NetworkCosmikCollectionLinkRemoval: 'network.cosmik.collectionLinkRemoval',
  NetworkCosmikDefs: 'network.cosmik.defs',
  ComAtprotoRepoStrongRef: 'com.atproto.repo.strongRef',
} as const
