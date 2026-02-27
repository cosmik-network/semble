/**
 * GENERATED CODE - DO NOT MODIFY
 */
import {
  type LexiconDoc,
  Lexicons,
  ValidationError,
  type ValidationResult,
} from '@atproto/lexicon';
import { type $Typed, is$typed, maybe$typed } from './util.js';

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
          "A record representing the removal of a collection link by a collection owner when they cannot delete the original link (which exists in another user's repository). The creator of this record (determined from the AT-URI) is the user who performed the removal.",
        key: 'tid',
        record: {
          type: 'object',
          required: ['collection', 'removedLink', 'removedAt'],
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
            removedAt: {
              type: 'string',
              format: 'datetime',
              description:
                'Timestamp when the link was removed from the collection.',
            },
          },
        },
      },
    },
  },
  NetworkCosmikConnection: {
    lexicon: 1,
    id: 'network.cosmik.connection',
    description:
      'A record representing a connection between two entities (URLs or cards).',
    defs: {
      main: {
        type: 'record',
        description:
          'A connection linking a source to a target, with optional type and note.',
        key: 'tid',
        record: {
          type: 'object',
          required: ['source', 'target'],
          properties: {
            source: {
              type: 'string',
              description: 'Source entity (URL string or AT URI)',
            },
            target: {
              type: 'string',
              description: 'Target entity (URL string or AT URI)',
            },
            connectionType: {
              type: 'string',
              description: 'Optional type of connection',
            },
            note: {
              type: 'string',
              description: 'Optional note about the connection',
              maxLength: 1000,
            },
            createdAt: {
              type: 'string',
              format: 'datetime',
              description: 'Timestamp when this connection was created.',
            },
            updatedAt: {
              type: 'string',
              format: 'datetime',
              description: 'Timestamp when this connection was last updated.',
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
  NetworkCosmikFollow: {
    lexicon: 1,
    id: 'network.cosmik.follow',
    description: 'A record representing a follow relationship.',
    defs: {
      main: {
        type: 'record',
        description: 'A record representing a follow of a user or collection.',
        key: 'tid',
        record: {
          type: 'object',
          required: ['subject', 'createdAt'],
          properties: {
            subject: {
              type: 'string',
              description:
                'DID of the user being followed, or AT URI of the collection being followed',
            },
            createdAt: {
              type: 'string',
              format: 'datetime',
              description: 'Timestamp when this follow was created.',
            },
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
  AtMarginAnnotation: {
    defs: {
      body: {
        description: 'Annotation body - the content of the annotation',
        properties: {
          format: {
            default: 'text/plain',
            description: 'MIME type of the body content',
            type: 'string',
          },
          language: {
            description: 'BCP47 language tag',
            type: 'string',
          },
          uri: {
            description: 'Reference to external body content',
            format: 'uri',
            type: 'string',
          },
          value: {
            description: 'Text content of the annotation',
            maxGraphemes: 3000,
            maxLength: 10000,
            type: 'string',
          },
        },
        type: 'object',
      },
      cssSelector: {
        description: 'W3C CssSelector - select DOM elements by CSS selector',
        properties: {
          type: {
            const: 'CssSelector',
            type: 'string',
          },
          value: {
            description: 'CSS selector string',
            maxLength: 2000,
            type: 'string',
          },
        },
        required: ['value'],
        type: 'object',
      },
      fragmentSelector: {
        description: 'W3C FragmentSelector - select by URI fragment',
        properties: {
          conformsTo: {
            description: 'Specification the fragment conforms to',
            format: 'uri',
            type: 'string',
          },
          type: {
            const: 'FragmentSelector',
            type: 'string',
          },
          value: {
            description: 'Fragment identifier value',
            maxLength: 1000,
            type: 'string',
          },
        },
        required: ['value'],
        type: 'object',
      },
      main: {
        description: 'A W3C-compliant web annotation stored on the AT Protocol',
        key: 'tid',
        record: {
          properties: {
            body: {
              description: 'The annotation content (text or reference)',
              ref: 'lex:at.margin.annotation#body',
              type: 'ref',
            },
            createdAt: {
              format: 'datetime',
              type: 'string',
            },
            motivation: {
              description: 'W3C motivation for the annotation',
              knownValues: [
                'commenting',
                'highlighting',
                'bookmarking',
                'tagging',
                'describing',
                'linking',
                'replying',
                'editing',
                'questioning',
                'assessing',
              ],
              type: 'string',
            },
            tags: {
              description: 'Tags for categorization',
              items: {
                maxGraphemes: 32,
                maxLength: 64,
                type: 'string',
              },
              maxLength: 10,
              type: 'array',
            },
            target: {
              description:
                'The resource being annotated with optional selector',
              ref: 'lex:at.margin.annotation#target',
              type: 'ref',
            },
          },
          required: ['target', 'createdAt'],
          type: 'object',
        },
        type: 'record',
      },
      rangeSelector: {
        description: 'W3C RangeSelector - select range between two selectors',
        properties: {
          endSelector: {
            description: 'Selector for range end',
            refs: [
              'lex:at.margin.annotation#textQuoteSelector',
              'lex:at.margin.annotation#textPositionSelector',
              'lex:at.margin.annotation#cssSelector',
              'lex:at.margin.annotation#xpathSelector',
            ],
            type: 'union',
          },
          startSelector: {
            description: 'Selector for range start',
            refs: [
              'lex:at.margin.annotation#textQuoteSelector',
              'lex:at.margin.annotation#textPositionSelector',
              'lex:at.margin.annotation#cssSelector',
              'lex:at.margin.annotation#xpathSelector',
            ],
            type: 'union',
          },
          type: {
            const: 'RangeSelector',
            type: 'string',
          },
        },
        required: ['startSelector', 'endSelector'],
        type: 'object',
      },
      target: {
        description: 'W3C SpecificResource - the target with optional selector',
        properties: {
          selector: {
            description: 'Selector to identify the specific segment',
            refs: [
              'lex:at.margin.annotation#textQuoteSelector',
              'lex:at.margin.annotation#textPositionSelector',
              'lex:at.margin.annotation#cssSelector',
              'lex:at.margin.annotation#xpathSelector',
              'lex:at.margin.annotation#fragmentSelector',
              'lex:at.margin.annotation#rangeSelector',
            ],
            type: 'union',
          },
          source: {
            description: 'The URL being annotated',
            format: 'uri',
            type: 'string',
          },
          sourceHash: {
            description: 'SHA256 hash of normalized URL for indexing',
            type: 'string',
          },
          state: {
            description: 'State of the resource at annotation time',
            ref: 'lex:at.margin.annotation#timeState',
            type: 'ref',
          },
          title: {
            description: 'Page title at time of annotation',
            maxLength: 500,
            type: 'string',
          },
        },
        required: ['source'],
        type: 'object',
      },
      textPositionSelector: {
        description: 'W3C TextPositionSelector - select by character offsets',
        properties: {
          end: {
            description: 'Ending character position (exclusive)',
            minimum: 0,
            type: 'integer',
          },
          start: {
            description: 'Starting character position (0-indexed, inclusive)',
            minimum: 0,
            type: 'integer',
          },
          type: {
            const: 'TextPositionSelector',
            type: 'string',
          },
        },
        required: ['start', 'end'],
        type: 'object',
      },
      textQuoteSelector: {
        description:
          'W3C TextQuoteSelector - select text by quoting it with context',
        properties: {
          exact: {
            description: 'The exact text to match',
            maxGraphemes: 1500,
            maxLength: 5000,
            type: 'string',
          },
          prefix: {
            description: 'Text immediately before the selection',
            maxGraphemes: 150,
            maxLength: 500,
            type: 'string',
          },
          suffix: {
            description: 'Text immediately after the selection',
            maxGraphemes: 150,
            maxLength: 500,
            type: 'string',
          },
          type: {
            const: 'TextQuoteSelector',
            type: 'string',
          },
        },
        required: ['exact'],
        type: 'object',
      },
      timeState: {
        description: 'W3C TimeState - record when content was captured',
        properties: {
          cached: {
            description: 'URL to cached/archived version',
            format: 'uri',
            type: 'string',
          },
          sourceDate: {
            description: 'When the source was accessed',
            format: 'datetime',
            type: 'string',
          },
        },
        type: 'object',
      },
      xpathSelector: {
        description: 'W3C XPathSelector - select by XPath expression',
        properties: {
          type: {
            const: 'XPathSelector',
            type: 'string',
          },
          value: {
            description: 'XPath expression',
            maxLength: 2000,
            type: 'string',
          },
        },
        required: ['value'],
        type: 'object',
      },
    },
    description:
      'W3C Web Annotation Data Model compliant annotation record for ATProto',
    id: 'at.margin.annotation',
    lexicon: 1,
    revision: 2,
  },
  AtMarginBookmark: {
    defs: {
      main: {
        description: 'A bookmarked URL (motivation: bookmarking)',
        key: 'tid',
        record: {
          properties: {
            createdAt: {
              format: 'datetime',
              type: 'string',
            },
            description: {
              description: 'Optional description/note',
              maxGraphemes: 300,
              maxLength: 1000,
              type: 'string',
            },
            source: {
              description: 'The bookmarked URL',
              format: 'uri',
              type: 'string',
            },
            sourceHash: {
              description: 'SHA256 hash of normalized URL for indexing',
              type: 'string',
            },
            tags: {
              description: 'Tags for categorization',
              items: {
                maxGraphemes: 32,
                maxLength: 64,
                type: 'string',
              },
              maxLength: 10,
              type: 'array',
            },
            title: {
              description: 'Page title',
              maxLength: 500,
              type: 'string',
            },
          },
          required: ['source', 'createdAt'],
          type: 'object',
        },
        type: 'record',
      },
    },
    description: 'A bookmark record - save URL for later',
    id: 'at.margin.bookmark',
    lexicon: 1,
  },
  AtMarginCollection: {
    defs: {
      main: {
        description: 'A named collection for organizing annotations',
        key: 'tid',
        record: {
          properties: {
            createdAt: {
              format: 'datetime',
              type: 'string',
            },
            description: {
              description: 'Collection description',
              maxGraphemes: 150,
              maxLength: 500,
              type: 'string',
            },
            icon: {
              description: 'Emoji icon or icon identifier for the collection',
              maxGraphemes: 100,
              maxLength: 100,
              type: 'string',
            },
            name: {
              description: 'Collection name',
              maxGraphemes: 50,
              maxLength: 100,
              type: 'string',
            },
          },
          required: ['name', 'createdAt'],
          type: 'object',
        },
        type: 'record',
      },
    },
    description: 'A collection of annotations (like a folder or notebook)',
    id: 'at.margin.collection',
    lexicon: 1,
  },
  AtMarginCollectionItem: {
    defs: {
      main: {
        description: 'Associates an annotation with a collection',
        key: 'tid',
        record: {
          properties: {
            annotation: {
              description: 'AT URI of the annotation, highlight, or bookmark',
              format: 'at-uri',
              type: 'string',
            },
            collection: {
              description: 'AT URI of the collection',
              format: 'at-uri',
              type: 'string',
            },
            createdAt: {
              format: 'datetime',
              type: 'string',
            },
            position: {
              description: 'Sort order within the collection',
              minimum: 0,
              type: 'integer',
            },
          },
          required: ['collection', 'annotation', 'createdAt'],
          type: 'object',
        },
        type: 'record',
      },
    },
    description: 'An item in a collection (links annotation to collection)',
    id: 'at.margin.collectionItem',
    lexicon: 1,
  },
  AtMarginHighlight: {
    defs: {
      main: {
        description: 'A highlight on a web page (motivation: highlighting)',
        key: 'tid',
        record: {
          properties: {
            color: {
              description: 'Highlight color (hex or named)',
              maxLength: 20,
              type: 'string',
            },
            createdAt: {
              format: 'datetime',
              type: 'string',
            },
            tags: {
              description: 'Tags for categorization',
              items: {
                maxGraphemes: 32,
                maxLength: 64,
                type: 'string',
              },
              maxLength: 10,
              type: 'array',
            },
            target: {
              description: 'The resource and segment being highlighted',
              ref: 'lex:at.margin.annotation#target',
              type: 'ref',
            },
          },
          required: ['target', 'createdAt'],
          type: 'object',
        },
        type: 'record',
      },
    },
    description:
      'A lightweight highlight record - annotation without body text',
    id: 'at.margin.highlight',
    lexicon: 1,
  },
  AtMarginLike: {
    defs: {
      main: {
        description: 'A like on an annotation or reply',
        key: 'tid',
        record: {
          properties: {
            createdAt: {
              format: 'datetime',
              type: 'string',
            },
            subject: {
              description: 'Reference to the annotation or reply being liked',
              ref: 'lex:at.margin.like#subjectRef',
              type: 'ref',
            },
          },
          required: ['subject', 'createdAt'],
          type: 'object',
        },
        type: 'record',
      },
      subjectRef: {
        properties: {
          cid: {
            format: 'cid',
            type: 'string',
          },
          uri: {
            format: 'at-uri',
            type: 'string',
          },
        },
        required: ['uri', 'cid'],
        type: 'object',
      },
    },
    id: 'at.margin.like',
    lexicon: 1,
  },
  AtMarginProfile: {
    defs: {
      main: {
        description: 'A profile for a user on the Margin network.',
        key: 'literal:self',
        record: {
          properties: {
            bio: {
              description: 'User biography or description.',
              maxLength: 5000,
              type: 'string',
            },
            createdAt: {
              format: 'datetime',
              type: 'string',
            },
            links: {
              description:
                'List of other relevant links (e.g. GitHub, Bluesky, etc).',
              items: {
                maxLength: 1000,
                type: 'string',
              },
              maxLength: 20,
              type: 'array',
            },
            website: {
              description: 'User website URL.',
              maxLength: 1000,
              type: 'string',
            },
          },
          required: ['createdAt'],
          type: 'object',
        },
        type: 'record',
      },
    },
    id: 'at.margin.profile',
    lexicon: 1,
  },
  AtMarginReply: {
    defs: {
      main: {
        description: 'A reply to an annotation (motivation: replying)',
        key: 'tid',
        record: {
          properties: {
            createdAt: {
              format: 'datetime',
              type: 'string',
            },
            format: {
              default: 'text/plain',
              description: 'MIME type of the text content',
              type: 'string',
            },
            parent: {
              description: 'Reference to the parent annotation or reply',
              ref: 'lex:at.margin.reply#replyRef',
              type: 'ref',
            },
            root: {
              description: 'Reference to the root annotation of the thread',
              ref: 'lex:at.margin.reply#replyRef',
              type: 'ref',
            },
            text: {
              description: 'Reply text content',
              maxGraphemes: 3000,
              maxLength: 10000,
              type: 'string',
            },
          },
          required: ['parent', 'root', 'text', 'createdAt'],
          type: 'object',
        },
        type: 'record',
      },
      replyRef: {
        description: 'Strong reference to an annotation or reply',
        properties: {
          cid: {
            format: 'cid',
            type: 'string',
          },
          uri: {
            format: 'at-uri',
            type: 'string',
          },
        },
        required: ['uri', 'cid'],
        type: 'object',
      },
    },
    description: 'A reply to an annotation or another reply',
    id: 'at.margin.reply',
    lexicon: 1,
    revision: 2,
  },
} as const satisfies Record<string, LexiconDoc>;
export const schemas = Object.values(schemaDict) satisfies LexiconDoc[];
export const lexicons: Lexicons = new Lexicons(schemas);

export function validate<T extends { $type: string }>(
  v: unknown,
  id: string,
  hash: string,
  requiredType: true,
): ValidationResult<T>;
export function validate<T extends { $type?: string }>(
  v: unknown,
  id: string,
  hash: string,
  requiredType?: false,
): ValidationResult<T>;
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
      };
}

export const ids = {
  NetworkCosmikCard: 'network.cosmik.card',
  NetworkCosmikCollection: 'network.cosmik.collection',
  NetworkCosmikCollectionLink: 'network.cosmik.collectionLink',
  NetworkCosmikCollectionLinkRemoval: 'network.cosmik.collectionLinkRemoval',
  NetworkCosmikConnection: 'network.cosmik.connection',
  NetworkCosmikDefs: 'network.cosmik.defs',
  NetworkCosmikFollow: 'network.cosmik.follow',
  ComAtprotoRepoStrongRef: 'com.atproto.repo.strongRef',
  AtMarginAnnotation: 'at.margin.annotation',
  AtMarginBookmark: 'at.margin.bookmark',
  AtMarginCollection: 'at.margin.collection',
  AtMarginCollectionItem: 'at.margin.collectionItem',
  AtMarginHighlight: 'at.margin.highlight',
  AtMarginLike: 'at.margin.like',
  AtMarginProfile: 'at.margin.profile',
  AtMarginReply: 'at.margin.reply',
} as const;
