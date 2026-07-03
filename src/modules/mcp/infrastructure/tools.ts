import { z } from 'zod';
import { SembleApiClient } from './sembleApiClient';

/**
 * MCP tool definitions. Each is an outcome-oriented wrapper over the existing
 * `/xrpc` `network.cosmik.*` REST API. The handler receives validated arguments
 * and a `SembleApiClient` already authenticated as the calling user, and returns
 * a plain-text result for the agent.
 *
 * Tools mirror the public API surface 1:1 (paths, params, and enums are taken
 * verbatim from the OpenAPI spec) so the MCP layer inherits all auth, validation,
 * and business rules for free. A few coarse-grained orchestration tools compose
 * several calls into one result.
 */
export interface McpTool {
  name: string;
  title: string;
  description: string;
  inputSchema: z.ZodTypeAny;
  handler: (
    args: Record<string, unknown>,
    client: SembleApiClient,
  ) => Promise<string>;
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}

// ---------------------------------------------------------------------------
// Shared enums (verbatim from the OpenAPI spec)
// ---------------------------------------------------------------------------

const urlType = z
  .enum([
    'article',
    'link',
    'book',
    'research',
    'audio',
    'video',
    'social',
    'event',
    'software',
  ])
  .describe(
    'URL type filter: article, link, book, research, audio, video, social, event, or software',
  );

const accessType = z
  .enum(['OPEN', 'CLOSED'])
  .describe('OPEN (others can contribute) or CLOSED');

const connectionType = z
  .enum([
    'SUPPORTS',
    'OPPOSES',
    'ADDRESSES',
    'HELPFUL',
    'LEADS_TO',
    'RELATED',
    'SUPPLEMENT',
    'EXPLAINER',
  ])
  .describe(
    'The discourse-graph relationship from source to target. See the semble://connection-types resource for semantics.',
  );

const targetType = z
  .enum(['USER', 'COLLECTION'])
  .describe('The kind of entity being targeted: USER or COLLECTION');

const subscriptionScope = z
  .enum(['CARD', 'CONNECTION', 'COLLECTION_SAVED'])
  .describe('Subscription notification scope');

const cardSortBy = z
  .enum(['createdAt', 'updatedAt', 'libraryCount'])
  .describe('Field to sort by');

const collectionSortBy = z
  .enum(['name', 'createdAt', 'updatedAt', 'cardCount', 'addedAt'])
  .describe('Field to sort by');

const connectionSortBy = z
  .enum(['createdAt', 'updatedAt'])
  .describe('Field to sort by');

const sortOrder = z.enum(['asc', 'desc']).describe('Sort direction');

const limit = z
  .number()
  .int()
  .optional()
  .describe('Max results to return (default 10)');

const page = z.number().int().optional().describe('Page number (default 1)');

export const tools: McpTool[] = [
  // -------------------------------------------------------------------------
  // Cards & notes
  // -------------------------------------------------------------------------
  {
    name: 'save_card',
    title: 'Save URL to Library',
    description:
      'Use when the user asks to save, add, or bookmark a URL to their Semble library. Optionally attach a note (markdown), add the card to collections, and set viaCardId for attribution (the card you discovered this URL through). Returns the created urlCardId (and noteCardId if a note was added).',
    inputSchema: z.object({
      url: z.string().describe('The URL to save'),
      note: z
        .string()
        .optional()
        .describe('An optional note (markdown) to attach to the URL'),
      collectionIds: z
        .array(z.string())
        .optional()
        .describe('IDs of collections to add the new card to'),
      viaCardId: z
        .string()
        .optional()
        .describe(
          'ID of the card you discovered this URL through (attribution / notification hook)',
        ),
    }),
    handler: async (args, client) => {
      const result = await client.post('/network.cosmik.card.addUrl', {
        url: args.url,
        note: args.note,
        collectionIds: args.collectionIds,
        viaCardId: args.viaCardId,
      });
      return asText(result);
    },
  },
  {
    name: 'update_card_associations',
    title: 'Update Card Associations',
    description:
      "Use when the user asks to change a saved URL card's note, or add/remove it from collections. Operates on an existing card by ID.",
    inputSchema: z.object({
      cardId: z.string().describe('The URL card ID'),
      note: z
        .string()
        .optional()
        .describe('Replacement note (markdown) for the card'),
      addToCollections: z
        .array(z.string())
        .optional()
        .describe('Collection IDs to add the card to'),
      removeFromCollections: z
        .array(z.string())
        .optional()
        .describe('Collection IDs to remove the card from'),
      viaCardId: z
        .string()
        .optional()
        .describe('Attribution: the card this URL was discovered through'),
    }),
    handler: async (args, client) => {
      const result = await client.post(
        '/network.cosmik.card.updateUrlAssociations',
        {
          cardId: args.cardId,
          note: args.note,
          addToCollections: args.addToCollections,
          removeFromCollections: args.removeFromCollections,
          viaCardId: args.viaCardId,
        },
      );
      return asText(result);
    },
  },
  {
    name: 'update_note',
    title: 'Update Card Note',
    description:
      'Use when the user asks to write, edit, or replace the note on a URL card. Sets the note text (markdown) for the given card.',
    inputSchema: z.object({
      cardId: z.string().describe('The URL card ID'),
      note: z.string().describe('The note text (markdown)'),
    }),
    handler: async (args, client) => {
      const result = await client.post('/network.cosmik.card.updateNote', {
        cardId: args.cardId,
        note: args.note,
      });
      return asText(result);
    },
  },
  {
    name: 'delete_card',
    title: 'Remove Card from Library',
    description:
      "DESTRUCTIVE. Use only when the user explicitly asks to remove or delete a card from their library. Removes the card by ID from the authenticated user's library.",
    inputSchema: z.object({
      cardId: z.string().describe('The card ID to remove'),
    }),
    handler: async (args, client) => {
      const result = await client.post(
        '/network.cosmik.card.removeFromLibrary',
        { cardId: args.cardId },
      );
      return asText(result);
    },
  },
  {
    name: 'get_card',
    title: 'Get Card',
    description:
      'Use when the user asks to read, view, or open a specific card by its ID. Returns the full card plus the collections it belongs to and the libraries (users) who saved it.',
    inputSchema: z.object({
      cardId: z.string().describe('The card ID'),
    }),
    handler: async (args, client) => {
      const result = await client.get('/network.cosmik.card.get', {
        cardId: args.cardId,
      });
      return asText(result);
    },
  },
  {
    name: 'search_library',
    title: 'Search My Library',
    description:
      "Use when the user asks to list, browse, or search the cards in their OWN Semble library. Returns a paginated list of the authenticated user's URL cards, filterable by text, URL type, and whether they're uncollected.",
    inputSchema: z.object({
      searchText: z
        .string()
        .optional()
        .describe('Filter cards by title, description, or URL'),
      urlType: urlType.optional(),
      uncollected: z
        .boolean()
        .optional()
        .describe('Only return cards not in any collection'),
      sortBy: cardSortBy.optional(),
      sortOrder: sortOrder.optional(),
      page,
      limit,
    }),
    handler: async (args, client) => {
      const result = await client.get('/network.cosmik.card.listMine', {
        searchText: args.searchText,
        urlType: args.urlType,
        uncollected: args.uncollected,
        sortBy: args.sortBy,
        sortOrder: args.sortOrder,
        page: args.page ?? 1,
        limit: args.limit ?? 10,
      });
      return asText(result);
    },
  },
  {
    name: 'search_network',
    title: 'Search the Network',
    description:
      'Use when the user asks to find or search for cards across the whole Semble network (everyone, not just their own library) by keyword. Searches titles, descriptions, and URLs.',
    inputSchema: z.object({
      searchQuery: z
        .string()
        .describe('Search query — keywords or natural-language phrase'),
      urlType: urlType.optional(),
      sortBy: cardSortBy.optional(),
      sortOrder: sortOrder.optional(),
      page,
      limit,
    }),
    handler: async (args, client) => {
      const result = await client.get('/network.cosmik.card.search', {
        searchQuery: args.searchQuery,
        urlType: args.urlType,
        sortBy: args.sortBy,
        sortOrder: args.sortOrder,
        page: args.page ?? 1,
        limit: args.limit ?? 10,
      });
      return asText(result);
    },
  },
  {
    name: 'list_user_cards',
    title: "List a User's Cards",
    description:
      "Use when the user asks to see another specific user's saved cards. Takes the user's handle or DID as identifier. Returns that user's public URL cards.",
    inputSchema: z.object({
      identifier: z.string().describe("The user's handle or DID"),
      urlType: urlType.optional(),
      uncollected: z
        .boolean()
        .optional()
        .describe('Only return cards not in any collection'),
      searchText: z.string().optional().describe('Filter by title, description, or URL'),
      sortBy: cardSortBy.optional(),
      sortOrder: sortOrder.optional(),
      page,
      limit,
    }),
    handler: async (args, client) => {
      const result = await client.get('/network.cosmik.card.listByUser', {
        identifier: args.identifier,
        urlType: args.urlType,
        uncollected: args.uncollected,
        searchText: args.searchText,
        sortBy: args.sortBy,
        sortOrder: args.sortOrder,
        page: args.page ?? 1,
        limit: args.limit ?? 10,
      });
      return asText(result);
    },
  },

  // -------------------------------------------------------------------------
  // URL / card-page context (network entry points)
  // -------------------------------------------------------------------------
  {
    name: 'get_url_metadata',
    title: 'Get URL Metadata',
    description:
      "Use to fetch a URL's metadata (title, description, etc.) and, with includeStats, its Semble network stats: libraryCount, noteCount, collectionCount, and connection counts by type. Good first call when exploring an arbitrary URL.",
    inputSchema: z.object({
      url: z.string().describe('The URL to inspect'),
      includeStats: z
        .boolean()
        .optional()
        .describe('Include Semble network stats for the URL'),
    }),
    handler: async (args, client) => {
      const result = await client.get('/network.cosmik.card.getUrlMetadata', {
        url: args.url,
        includeStats: args.includeStats,
      });
      return asText(result);
    },
  },
  {
    name: 'get_library_status',
    title: 'Get My Library Status for URL',
    description:
      'Use to check whether the authenticated user has already saved a given URL, and which of their collections it is in.',
    inputSchema: z.object({
      url: z.string().describe('The URL to check'),
    }),
    handler: async (args, client) => {
      const result = await client.get('/network.cosmik.card.getLibraryStatus', {
        url: args.url,
      });
      return asText(result);
    },
  },
  {
    name: 'get_url_savers',
    title: 'Get Users Who Saved a URL',
    description:
      'Use to find which users have saved a given URL to their library. Returns each user with their card.',
    inputSchema: z.object({
      url: z.string().describe('The URL'),
      sortBy: cardSortBy.optional(),
      sortOrder: sortOrder.optional(),
      page,
      limit,
    }),
    handler: async (args, client) => {
      const result = await client.get(
        '/network.cosmik.card.getLibrariesForUrl',
        {
          url: args.url,
          sortBy: args.sortBy,
          sortOrder: args.sortOrder,
          page: args.page ?? 1,
          limit: args.limit ?? 10,
        },
      );
      return asText(result);
    },
  },
  {
    name: 'get_url_notes',
    title: 'Get Notes for a URL',
    description:
      'Use to read the notes other users have written about a given URL.',
    inputSchema: z.object({
      url: z.string().describe('The URL'),
      sortBy: cardSortBy.optional(),
      sortOrder: sortOrder.optional(),
      page,
      limit,
    }),
    handler: async (args, client) => {
      const result = await client.get(
        '/network.cosmik.card.getNoteCardsForUrl',
        {
          url: args.url,
          sortBy: args.sortBy,
          sortOrder: args.sortOrder,
          page: args.page ?? 1,
          limit: args.limit ?? 10,
        },
      );
      return asText(result);
    },
  },
  {
    name: 'get_url_collections',
    title: 'Get Collections Containing a URL',
    description:
      'Use to find which collections contain a given URL across the network.',
    inputSchema: z.object({
      url: z.string().describe('The URL'),
      sortBy: collectionSortBy.optional(),
      sortOrder: sortOrder.optional(),
      page,
      limit,
    }),
    handler: async (args, client) => {
      const result = await client.get('/network.cosmik.collection.getForUrl', {
        url: args.url,
        sortBy: args.sortBy,
        sortOrder: args.sortOrder,
        page: args.page ?? 1,
        limit: args.limit ?? 10,
      });
      return asText(result);
    },
  },
  {
    name: 'get_card_network_context',
    title: 'Get Full Network Context for a URL',
    description:
      'Coarse-grained: fetches the full picture around a URL in one call — metadata + stats, who saved it, which collections contain it, notes left on it, and its connections. Use when the user wants a rich overview of how a URL sits in the network.',
    inputSchema: z.object({
      url: z.string().describe('The URL to explore'),
    }),
    handler: async (args, client) => {
      const url = args.url as string;
      const [metadata, savers, collections, notes, connections] =
        await Promise.all([
          client
            .get('/network.cosmik.card.getUrlMetadata', {
              url,
              includeStats: true,
            })
            .catch((e) => ({ error: String(e) })),
          client
            .get('/network.cosmik.card.getLibrariesForUrl', { url, limit: 10 })
            .catch((e) => ({ error: String(e) })),
          client
            .get('/network.cosmik.collection.getForUrl', { url, limit: 10 })
            .catch((e) => ({ error: String(e) })),
          client
            .get('/network.cosmik.card.getNoteCardsForUrl', { url, limit: 10 })
            .catch((e) => ({ error: String(e) })),
          client
            .get('/network.cosmik.connection.getForUrl', {
              url,
              direction: 'both',
              limit: 10,
            })
            .catch((e) => ({ error: String(e) })),
        ]);
      return asText({ metadata, savers, collections, notes, connections });
    },
  },

  // -------------------------------------------------------------------------
  // Collections
  // -------------------------------------------------------------------------
  {
    name: 'create_collection',
    title: 'Create Collection',
    description:
      'Use when the user asks to create or make a new collection. Returns the created collection with its ID.',
    inputSchema: z.object({
      name: z.string().describe('Collection name'),
      description: z
        .string()
        .optional()
        .describe('Optional collection description'),
      accessType: accessType.optional(),
    }),
    handler: async (args, client) => {
      const result = await client.post('/network.cosmik.collection.create', {
        name: args.name,
        description: args.description,
        accessType: args.accessType,
      });
      return asText(result);
    },
  },
  {
    name: 'update_collection',
    title: 'Update Collection',
    description:
      "Use when the user asks to rename a collection, change its description, or change its access type. Note: name is required by the API even for partial edits — pass the existing name if unchanged.",
    inputSchema: z.object({
      collectionId: z.string().describe('The collection ID'),
      name: z.string().describe('Collection name (required)'),
      description: z.string().optional().describe('Collection description'),
      accessType: accessType.optional(),
    }),
    handler: async (args, client) => {
      const result = await client.post('/network.cosmik.collection.update', {
        collectionId: args.collectionId,
        name: args.name,
        description: args.description,
        accessType: args.accessType,
      });
      return asText(result);
    },
  },
  {
    name: 'delete_collection',
    title: 'Delete Collection',
    description:
      'DESTRUCTIVE. Use only when the user explicitly asks to delete a collection. Deletes by ID.',
    inputSchema: z.object({
      collectionId: z.string().describe('The collection ID to delete'),
    }),
    handler: async (args, client) => {
      const result = await client.post('/network.cosmik.collection.delete', {
        collectionId: args.collectionId,
      });
      return asText(result);
    },
  },
  {
    name: 'list_my_collections',
    title: 'List My Collections',
    description:
      "Use when the user asks to list, browse, or see their own collections. Returns a paginated list of the authenticated user's collections with their IDs.",
    inputSchema: z.object({
      searchText: z.string().optional().describe('Filter collections by name'),
      sortBy: collectionSortBy.optional(),
      sortOrder: sortOrder.optional(),
      page,
      limit,
    }),
    handler: async (args, client) => {
      const result = await client.get('/network.cosmik.collection.listMine', {
        searchText: args.searchText,
        sortBy: args.sortBy,
        sortOrder: args.sortOrder,
        page: args.page ?? 1,
        limit: args.limit ?? 10,
      });
      return asText(result);
    },
  },
  {
    name: 'get_collection',
    title: 'Get Collection',
    description:
      'Use when the user asks to open or read a specific collection by ID. Returns the collection plus its URL cards.',
    inputSchema: z.object({
      collectionId: z.string().describe('The collection ID'),
      urlType: urlType.optional(),
      sortBy: cardSortBy.optional(),
      sortOrder: sortOrder.optional(),
      page,
      limit,
    }),
    handler: async (args, client) => {
      const result = await client.get('/network.cosmik.collection.get', {
        collectionId: args.collectionId,
        urlType: args.urlType,
        sortBy: args.sortBy,
        sortOrder: args.sortOrder,
        page: args.page ?? 1,
        limit: args.limit ?? 10,
      });
      return asText(result);
    },
  },
  {
    name: 'get_collection_by_aturi',
    title: 'Get Collection by AT URI',
    description:
      'Use to open a collection identified by a handle + record key (its AT Protocol URI). Returns the collection plus its URL cards.',
    inputSchema: z.object({
      handle: z.string().describe("The owner's handle"),
      recordKey: z.string().describe('The collection record key'),
      urlType: urlType.optional(),
      sortBy: cardSortBy.optional(),
      sortOrder: sortOrder.optional(),
      page,
      limit,
    }),
    handler: async (args, client) => {
      const result = await client.get('/network.cosmik.collection.getByAtUri', {
        handle: args.handle,
        recordKey: args.recordKey,
        urlType: args.urlType,
        sortBy: args.sortBy,
        sortOrder: args.sortOrder,
        page: args.page ?? 1,
        limit: args.limit ?? 10,
      });
      return asText(result);
    },
  },
  {
    name: 'search_collections',
    title: 'Search Collections',
    description:
      'Use when the user asks to find collections across the network. Optionally scope to a specific user (identifier) or access type.',
    inputSchema: z.object({
      searchText: z.string().optional().describe('Search query'),
      identifier: z
        .string()
        .optional()
        .describe("Scope to a user's collections (handle or DID)"),
      accessType: accessType.optional(),
      sortBy: collectionSortBy.optional(),
      sortOrder: sortOrder.optional(),
      page,
      limit,
    }),
    handler: async (args, client) => {
      const result = await client.get('/network.cosmik.collection.search', {
        searchText: args.searchText,
        identifier: args.identifier,
        accessType: args.accessType,
        sortBy: args.sortBy,
        sortOrder: args.sortOrder,
        page: args.page ?? 1,
        limit: args.limit ?? 10,
      });
      return asText(result);
    },
  },
  {
    name: 'list_user_collections',
    title: "List a User's Collections",
    description:
      "Use when the user asks to see another user's collections. Takes the user's handle or DID.",
    inputSchema: z.object({
      identifier: z.string().describe("The user's handle or DID"),
      sortBy: collectionSortBy.optional(),
      sortOrder: sortOrder.optional(),
      page,
      limit,
    }),
    handler: async (args, client) => {
      const result = await client.get('/network.cosmik.collection.listByUser', {
        identifier: args.identifier,
        sortBy: args.sortBy,
        sortOrder: args.sortOrder,
        page: args.page ?? 1,
        limit: args.limit ?? 10,
      });
      return asText(result);
    },
  },
  {
    name: 'list_contributed_collections',
    title: 'List Collections a User Contributed To',
    description:
      'Use to find OPEN collections that a given user has contributed cards to. Takes the user\'s handle or DID.',
    inputSchema: z.object({
      identifier: z.string().describe("The user's handle or DID"),
      sortBy: collectionSortBy.optional(),
      sortOrder: sortOrder.optional(),
      page,
      limit,
    }),
    handler: async (args, client) => {
      const result = await client.get(
        '/network.cosmik.collection.listContributed',
        {
          identifier: args.identifier,
          sortBy: args.sortBy,
          sortOrder: args.sortOrder,
          page: args.page ?? 1,
          limit: args.limit ?? 10,
        },
      );
      return asText(result);
    },
  },
  {
    name: 'get_collection_followers',
    title: 'Get Collection Followers',
    description: 'Use to list the users following a given collection.',
    inputSchema: z.object({
      collectionId: z.string().describe('The collection ID'),
      page,
      limit,
    }),
    handler: async (args, client) => {
      const result = await client.get(
        '/network.cosmik.collection.getFollowers',
        {
          collectionId: args.collectionId,
          page: args.page ?? 1,
          limit: args.limit ?? 10,
        },
      );
      return asText(result);
    },
  },
  {
    name: 'get_collection_contributors',
    title: 'Get Collection Contributors',
    description:
      'Use to list the users who have contributed cards to a given collection, each with their contribution count.',
    inputSchema: z.object({
      collectionId: z.string().describe('The collection ID'),
      page,
      limit,
    }),
    handler: async (args, client) => {
      const result = await client.get(
        '/network.cosmik.collection.getContributors',
        {
          collectionId: args.collectionId,
          page: args.page ?? 1,
          limit: args.limit ?? 10,
        },
      );
      return asText(result);
    },
  },

  // -------------------------------------------------------------------------
  // Connections (discourse-graph layer)
  // -------------------------------------------------------------------------
  {
    name: 'connect_cards',
    title: 'Connect Two URLs/Cards',
    description:
      'Use when the user asks to relate, link, or connect two pieces of content with a typed relationship (e.g. one supports/opposes/explains another). Source and target can each be a URL or a card ID. See the semble://connection-types resource for relationship semantics.',
    inputSchema: z.object({
      sourceType: z
        .enum(['URL', 'CARD'])
        .describe('Whether sourceValue is a URL or a card ID'),
      sourceValue: z.string().describe('The source URL or card ID'),
      targetType: z
        .enum(['URL', 'CARD'])
        .describe('Whether targetValue is a URL or a card ID'),
      targetValue: z.string().describe('The target URL or card ID'),
      connectionType: connectionType.optional(),
      note: z
        .string()
        .optional()
        .describe('Optional note (markdown) explaining the connection'),
    }),
    handler: async (args, client) => {
      const result = await client.post('/network.cosmik.connection.create', {
        sourceType: args.sourceType,
        sourceValue: args.sourceValue,
        targetType: args.targetType,
        targetValue: args.targetValue,
        connectionType: args.connectionType,
        note: args.note,
      });
      return asText(result);
    },
  },
  {
    name: 'update_connection',
    title: 'Update Connection',
    description:
      'Use to change an existing connection: its type, its note, remove the note, or swap source and target direction.',
    inputSchema: z.object({
      connectionId: z.string().describe('The connection ID'),
      connectionType: connectionType.optional(),
      note: z.string().optional().describe('Replacement note (markdown)'),
      removeNote: z.boolean().optional().describe('Remove the note entirely'),
      swap: z
        .boolean()
        .optional()
        .describe('Swap the source and target (reverse direction)'),
    }),
    handler: async (args, client) => {
      const result = await client.post('/network.cosmik.connection.update', {
        connectionId: args.connectionId,
        connectionType: args.connectionType,
        note: args.note,
        removeNote: args.removeNote,
        swap: args.swap,
      });
      return asText(result);
    },
  },
  {
    name: 'delete_connection',
    title: 'Delete Connection',
    description:
      'DESTRUCTIVE. Use only when the user explicitly asks to remove a connection. Deletes by ID.',
    inputSchema: z.object({
      connectionId: z.string().describe('The connection ID to delete'),
    }),
    handler: async (args, client) => {
      const result = await client.post('/network.cosmik.connection.delete', {
        connectionId: args.connectionId,
      });
      return asText(result);
    },
  },
  {
    name: 'get_url_connections',
    title: 'Get Connections for a URL',
    description:
      'Use to see the typed connections (incoming, outgoing, or both) for a given URL — each with its type, note, curator, and the source/target.',
    inputSchema: z.object({
      url: z.string().describe('The URL'),
      direction: z
        .enum(['forward', 'backward', 'both'])
        .optional()
        .describe('forward (outgoing), backward (incoming), or both'),
      connectionTypes: z
        .array(connectionType)
        .optional()
        .describe('Filter to specific connection types'),
      sortBy: connectionSortBy.optional(),
      sortOrder: sortOrder.optional(),
      page,
      limit,
    }),
    handler: async (args, client) => {
      const result = await client.get('/network.cosmik.connection.getForUrl', {
        url: args.url,
        direction: args.direction,
        connectionTypes: args.connectionTypes,
        sortBy: args.sortBy,
        sortOrder: args.sortOrder,
        page: args.page ?? 1,
        limit: args.limit ?? 10,
      });
      return asText(result);
    },
  },
  {
    name: 'list_user_connections',
    title: "List a User's Connections",
    description:
      "Use to list the connections a given user has made. Takes the user's handle or DID.",
    inputSchema: z.object({
      identifier: z.string().describe("The user's handle or DID"),
      connectionTypes: z
        .array(connectionType)
        .optional()
        .describe('Filter to specific connection types'),
      sortBy: connectionSortBy.optional(),
      sortOrder: sortOrder.optional(),
      page,
      limit,
    }),
    handler: async (args, client) => {
      const result = await client.get(
        '/network.cosmik.connection.listByUser',
        {
          identifier: args.identifier,
          connectionTypes: args.connectionTypes,
          sortBy: args.sortBy,
          sortOrder: args.sortOrder,
          page: args.page ?? 1,
          limit: args.limit ?? 10,
        },
      );
      return asText(result);
    },
  },

  // -------------------------------------------------------------------------
  // Accounts
  // -------------------------------------------------------------------------
  {
    name: 'get_my_profile',
    title: 'Get My Profile',
    description:
      "Use to read the authenticated user's own profile. With includeStats, includes counts (followers, following, cards, collections, connections, etc.).",
    inputSchema: z.object({
      includeStats: z.boolean().optional().describe('Include profile stats'),
    }),
    handler: async (args, client) => {
      const result = await client.get('/network.cosmik.actor.getMyProfile', {
        includeStats: args.includeStats,
      });
      return asText(result);
    },
  },
  {
    name: 'get_account_profile',
    title: 'Get Account Profile',
    description:
      "Use to read another user's profile by handle or DID. With includeStats, includes counts plus relationship flags (isFollowing, followsYou, isSubscribed, subscriptionScopes).",
    inputSchema: z.object({
      identifier: z.string().describe("The user's handle or DID"),
      includeStats: z.boolean().optional().describe('Include profile stats'),
    }),
    handler: async (args, client) => {
      const result = await client.get('/network.cosmik.actor.getProfile', {
        identifier: args.identifier,
        includeStats: args.includeStats,
      });
      return asText(result);
    },
  },
  {
    name: 'search_accounts',
    title: 'Search Accounts',
    description:
      'Use when the user wants to find people / AT Protocol accounts by name or handle.',
    inputSchema: z.object({
      query: z.string().describe('Search term (name or handle)'),
      limit,
      cursor: z.string().optional().describe('Pagination cursor'),
    }),
    handler: async (args, client) => {
      const result = await client.get('/network.cosmik.search.getAccounts', {
        q: args.query,
        term: args.query,
        limit: args.limit ?? 10,
        cursor: args.cursor,
      });
      return asText(result);
    },
  },

  // -------------------------------------------------------------------------
  // Feeds (discovery)
  // -------------------------------------------------------------------------
  {
    name: 'get_global_feed',
    title: 'Get Global Feed',
    description:
      'Use for general discovery of recent activity across all of Semble. Activities are CARD_COLLECTED or CONNECTION_CREATED. Filter by urlType, source (margin/semble), and activity types.',
    inputSchema: z.object({
      urlType: urlType.optional(),
      source: z
        .enum(['margin', 'semble'])
        .optional()
        .describe('Activity source'),
      activityTypes: z
        .array(z.string())
        .optional()
        .describe('Filter to specific activity types'),
      includeKnownBots: z.boolean().optional(),
      beforeActivityId: z
        .string()
        .optional()
        .describe('Cursor: return activity before this ID'),
      page,
      limit,
    }),
    handler: async (args, client) => {
      const result = await client.get('/network.cosmik.feed.getGlobal', {
        urlType: args.urlType,
        source: args.source,
        activityTypes: args.activityTypes,
        includeKnownBots: args.includeKnownBots,
        beforeActivityId: args.beforeActivityId,
        page: args.page ?? 1,
        limit: args.limit ?? 10,
      });
      return asText(result);
    },
  },
  {
    name: 'get_following_feed',
    title: 'Get Following Feed',
    description:
      "Use to see recent activity from accounts the authenticated user follows. Same filters as the global feed.",
    inputSchema: z.object({
      urlType: urlType.optional(),
      source: z
        .enum(['margin', 'semble'])
        .optional()
        .describe('Activity source'),
      activityTypes: z.array(z.string()).optional(),
      includeKnownBots: z.boolean().optional(),
      beforeActivityId: z.string().optional(),
      page,
      limit,
    }),
    handler: async (args, client) => {
      const result = await client.get('/network.cosmik.feed.getFollowing', {
        urlType: args.urlType,
        source: args.source,
        activityTypes: args.activityTypes,
        includeKnownBots: args.includeKnownBots,
        beforeActivityId: args.beforeActivityId,
        page: args.page ?? 1,
        limit: args.limit ?? 10,
      });
      return asText(result);
    },
  },

  // -------------------------------------------------------------------------
  // Social — follow / subscribe
  // -------------------------------------------------------------------------
  {
    name: 'follow',
    title: 'Follow a User or Collection',
    description:
      'Use when the user asks to follow someone or a collection. Following drives the following-feed. For notifications, use subscribe instead.',
    inputSchema: z.object({
      targetId: z.string().describe('The user DID or collection ID to follow'),
      targetType,
    }),
    handler: async (args, client) => {
      const result = await client.post('/network.cosmik.graph.follow', {
        targetId: args.targetId,
        targetType: args.targetType,
      });
      return asText(result);
    },
  },
  {
    name: 'unfollow',
    title: 'Unfollow a User or Collection',
    description: 'Use when the user asks to unfollow someone or a collection.',
    inputSchema: z.object({
      targetId: z.string().describe('The user DID or collection ID'),
      targetType,
    }),
    handler: async (args, client) => {
      const result = await client.post('/network.cosmik.graph.unfollow', {
        targetId: args.targetId,
        targetType: args.targetType,
      });
      return asText(result);
    },
  },
  {
    name: 'subscribe',
    title: 'Subscribe to a User or Collection',
    description:
      'Use when the user asks to get notified about a user or collection. Subscribing drives notifications at CARD / CONNECTION / COLLECTION_SAVED granularity (distinct from follow).',
    inputSchema: z.object({
      targetId: z.string().describe('The user DID or collection ID'),
      targetType,
      scopes: z
        .array(subscriptionScope)
        .optional()
        .describe('Which events to be notified about'),
    }),
    handler: async (args, client) => {
      const result = await client.post('/network.cosmik.graph.subscribe', {
        targetId: args.targetId,
        targetType: args.targetType,
        scopes: args.scopes,
      });
      return asText(result);
    },
  },
  {
    name: 'unsubscribe',
    title: 'Unsubscribe from a User or Collection',
    description:
      'Use when the user asks to stop being notified about a user or collection.',
    inputSchema: z.object({
      targetId: z.string().describe('The user DID or collection ID'),
      targetType,
    }),
    handler: async (args, client) => {
      const result = await client.post('/network.cosmik.graph.unsubscribe', {
        targetId: args.targetId,
        targetType: args.targetType,
      });
      return asText(result);
    },
  },
  {
    name: 'update_subscription',
    title: 'Update Subscription Scopes',
    description:
      'Use to change which events you are notified about for an existing subscription. Scopes are required and replace the existing set.',
    inputSchema: z.object({
      targetId: z.string().describe('The user DID or collection ID'),
      targetType,
      scopes: z
        .array(subscriptionScope)
        .describe('The new set of subscription scopes (replaces existing)'),
    }),
    handler: async (args, client) => {
      const result = await client.post(
        '/network.cosmik.graph.updateSubscription',
        {
          targetId: args.targetId,
          targetType: args.targetType,
          scopes: args.scopes,
        },
      );
      return asText(result);
    },
  },
  {
    name: 'get_my_subscriptions',
    title: 'List My Subscriptions',
    description:
      "Use to list the authenticated user's subscriptions, optionally filtered by target type.",
    inputSchema: z.object({
      targetType: targetType.optional(),
      page,
      limit,
    }),
    handler: async (args, client) => {
      const result = await client.get('/network.cosmik.graph.getSubscriptions', {
        targetType: args.targetType,
        page: args.page ?? 1,
        limit: args.limit ?? 10,
      });
      return asText(result);
    },
  },

  // -------------------------------------------------------------------------
  // Notifications
  // -------------------------------------------------------------------------
  {
    name: 'get_notifications',
    title: 'Get My Notifications',
    description:
      "Use to read the authenticated user's notifications. Optionally only unread ones. Notification types include USER_ADDED_YOUR_CARD, SUBSCRIBED_USER_ADDED_CARD, USER_FOLLOWED_YOU, and others.",
    inputSchema: z.object({
      unreadOnly: z.boolean().optional().describe('Only return unread notifications'),
      sortBy: z.string().optional().describe('Field to sort by'),
      sortOrder: sortOrder.optional(),
      page,
      limit,
    }),
    handler: async (args, client) => {
      const result = await client.get('/network.cosmik.notification.list', {
        unreadOnly: args.unreadOnly,
        sortBy: args.sortBy,
        sortOrder: args.sortOrder,
        page: args.page ?? 1,
        limit: args.limit ?? 10,
      });
      return asText(result);
    },
  },
  {
    name: 'get_unread_notification_count',
    title: 'Get Unread Notification Count',
    description: 'Use to get the count of unread notifications.',
    inputSchema: z.object({}),
    handler: async (_args, client) => {
      const result = await client.get('/network.cosmik.notification.getUnreadCount');
      return asText(result);
    },
  },
  {
    name: 'mark_notifications_read',
    title: 'Mark Notifications Read',
    description:
      'Use to mark specific notifications as read by their IDs.',
    inputSchema: z.object({
      notificationIds: z
        .array(z.string())
        .describe('IDs of the notifications to mark read'),
    }),
    handler: async (args, client) => {
      const result = await client.post('/network.cosmik.notification.markRead', {
        notificationIds: args.notificationIds,
      });
      return asText(result);
    },
  },
  {
    name: 'mark_all_notifications_read',
    title: 'Mark All Notifications Read',
    description: 'Use to mark every notification as read.',
    inputSchema: z.object({}),
    handler: async (_args, client) => {
      const result = await client.post('/network.cosmik.notification.markAllRead', {});
      return asText(result);
    },
  },

  // -------------------------------------------------------------------------
  // Semantic / similarity search
  // -------------------------------------------------------------------------
  {
    name: 'semantic_search',
    title: 'Semantic Search',
    description:
      'Use when the user asks a conceptual or natural-language question to find related saved URLs across Semble (not just keyword matches). Optionally scope to a user or URL type.',
    inputSchema: z.object({
      query: z.string().describe('Natural-language search query'),
      urlType: urlType.optional(),
      identifier: z
        .string()
        .optional()
        .describe("Scope to a user's content (handle or DID)"),
      threshold: z
        .number()
        .optional()
        .describe('Similarity threshold (0–1), higher = stricter'),
      sortBy: z.string().optional().describe('Field to sort by'),
      sortOrder: sortOrder.optional(),
      page,
      limit,
    }),
    handler: async (args, client) => {
      const result = await client.get('/network.cosmik.search.semantic', {
        query: args.query,
        urlType: args.urlType,
        identifier: args.identifier,
        threshold: args.threshold,
        sortBy: args.sortBy,
        sortOrder: args.sortOrder,
        page: args.page ?? 1,
        limit: args.limit ?? 10,
      });
      return asText(result);
    },
  },
  {
    name: 'find_similar_urls',
    title: 'Find Similar URLs',
    description:
      'Use when the user wants content similar/related to a specific URL (semantic recommendations). Returns URLs similar to the given one.',
    inputSchema: z.object({
      url: z.string().describe('The reference URL'),
      urlType: urlType.optional(),
      threshold: z
        .number()
        .optional()
        .describe('Similarity threshold (0–1), higher = stricter'),
      sortBy: z.string().optional().describe('Field to sort by'),
      sortOrder: sortOrder.optional(),
      page,
      limit,
    }),
    handler: async (args, client) => {
      const result = await client.get('/network.cosmik.search.getSimilarUrls', {
        url: args.url,
        urlType: args.urlType,
        threshold: args.threshold,
        sortBy: args.sortBy,
        sortOrder: args.sortOrder,
        page: args.page ?? 1,
        limit: args.limit ?? 10,
      });
      return asText(result);
    },
  },
];
