import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, sql } from 'drizzle-orm';
import {
  GraphNodeDTO,
  GraphEdgeDTO,
  GraphDataDTO,
} from '../../../domain/IGraphQueryRepository';
import { cards } from '../schema/card.sql';
import { collections, collectionCards } from '../schema/collection.sql';
import { connections } from '../schema/connection.sql';

export class GraphQueryService {
  constructor(private db: PostgresJsDatabase) {}

  async getGraphData(
    page: number = 1,
    limit: number = 300,
    userId?: string,
  ): Promise<GraphDataDTO> {
    // Fetch all data in parallel
    const [urlNodes, collectionNodes, collectionUrlEdges, urlConnectionEdges] =
      await Promise.all([
        this.getUrlNodes(userId),
        this.getCollectionNodes(userId),
        this.getCollectionUrlEdges(userId),
        this.getUrlConnectionEdges(userId),
      ]);

    // Combine all nodes
    const allNodes = [...urlNodes, ...collectionNodes];
    const totalNodeCount = allNodes.length;

    // Apply pagination to nodes
    const offset = (page - 1) * limit;
    const paginatedNodes = allNodes.slice(offset, offset + limit);

    // Create a Set of loaded node IDs for efficient lookup
    const loadedNodeIds = new Set(paginatedNodes.map((node) => node.id));

    // Filter edges to only include those where BOTH source and target are in loaded nodes
    const allEdges = [...collectionUrlEdges, ...urlConnectionEdges];

    const filteredEdges = allEdges.filter(
      (edge) =>
        loadedNodeIds.has(edge.source) && loadedNodeIds.has(edge.target),
    );

    return {
      nodes: paginatedNodes,
      edges: filteredEdges,
      totalNodeCount,
    };
  }

  private async getUrlNodes(userId?: string): Promise<GraphNodeDTO[]> {
    if (userId) {
      // For user-scoped graph: include URLs authored by user OR in their connections
      const urlCards = await this.db.execute<{
        id: string;
        url: string;
        content_data: any;
        url_type: string | null;
      }>(sql`
        SELECT DISTINCT
          c.id,
          c.url,
          c.content_data,
          c.url_type
        FROM cards c
        WHERE c.type = 'URL'
          AND c.url IS NOT NULL
          AND (
            c.author_id = ${userId}
            OR c.url IN (
              SELECT source_value FROM connections
              WHERE curator_id = ${userId} AND source_type = 'URL'
              UNION
              SELECT target_value FROM connections
              WHERE curator_id = ${userId} AND target_type = 'URL'
            )
          )
      `);

      // Fetch all URLs from user's connections
      const connectionUrls = await this.db.execute<{ url: string }>(sql`
        SELECT DISTINCT source_value as url
        FROM connections
        WHERE curator_id = ${userId} AND source_type = 'URL'
        UNION
        SELECT DISTINCT target_value as url
        FROM connections
        WHERE curator_id = ${userId} AND target_type = 'URL'
      `);

      // Track which URLs we've created nodes for
      const fetchedUrls = new Set(urlCards.map((r) => r.url));
      const nodes: GraphNodeDTO[] = [];

      // Add nodes for URL cards
      nodes.push(
        ...urlCards.map((row) => {
          const contentData = row.content_data as any;
          const title = contentData?.title || row.url || 'Untitled URL';

          return {
            id: `url:${row.url}`,
            type: 'URL' as const,
            label: title,
            metadata: {
              cardId: row.id,
              url: row.url,
              urlType: row.url_type,
              title,
              description: contentData?.description,
              imageUrl: contentData?.imageUrl,
            },
          };
        }),
      );

      // Add synthetic nodes for URLs from connections that don't have cards
      for (const row of connectionUrls) {
        if (!fetchedUrls.has(row.url)) {
          nodes.push({
            id: `url:${row.url}`,
            type: 'URL' as const,
            label: row.url,
            metadata: {
              url: row.url,
              title: row.url,
              synthetic: true, // Mark as not in database
            },
          });
        }
      }

      return nodes;
    }

    // Global graph: all URLs
    const results = await this.db
      .select({
        id: cards.id,
        url: cards.url,
        contentData: cards.contentData,
        urlType: cards.urlType,
      })
      .from(cards)
      .where(and(eq(cards.type, 'URL'), sql`${cards.url} IS NOT NULL`));

    return results.map((row) => {
      const contentData = row.contentData as any;
      const title = contentData?.title || row.url || 'Untitled URL';

      return {
        id: `url:${row.url}`,
        type: 'URL' as const,
        label: title,
        metadata: {
          cardId: row.id,
          url: row.url,
          urlType: row.urlType,
          title,
          description: contentData?.description,
          imageUrl: contentData?.imageUrl,
        },
      };
    });
  }

  private async getCollectionNodes(userId?: string): Promise<GraphNodeDTO[]> {
    if (userId) {
      // For user-scoped graph: collections authored by user OR followed by user
      const results = await this.db.execute<{
        id: string;
        name: string;
        description: string | null;
        author_id: string;
        card_count: number;
      }>(sql`
        SELECT
          c.id,
          c.name,
          c.description,
          c.author_id,
          c.card_count
        FROM collections c
        WHERE c.author_id = ${userId}
          OR c.id::text IN (
            SELECT target_id FROM follows
            WHERE follower_id = ${userId} AND target_type = 'collection'
          )
      `);

      return results.map((row) => ({
        id: `collection:${row.id}`,
        type: 'COLLECTION' as const,
        label: row.name,
        metadata: {
          collectionId: row.id,
          name: row.name,
          description: row.description,
          authorId: row.author_id,
          cardCount: row.card_count,
        },
      }));
    }

    // Global graph: all collections
    const results = await this.db
      .select({
        id: collections.id,
        name: collections.name,
        description: collections.description,
        authorId: collections.authorId,
        cardCount: collections.cardCount,
      })
      .from(collections);

    return results.map((row) => ({
      id: `collection:${row.id}`,
      type: 'COLLECTION' as const,
      label: row.name,
      metadata: {
        collectionId: row.id,
        name: row.name,
        description: row.description,
        authorId: row.authorId,
        cardCount: row.cardCount,
      },
    }));
  }

  private async getCollectionUrlEdges(
    userId?: string,
  ): Promise<GraphEdgeDTO[]> {
    if (userId) {
      // For user-scoped graph: only include collections authored by or followed by the user
      const results = await this.db.execute<{
        collection_id: string;
        card_id: string;
        url: string;
        added_by: string;
      }>(sql`
        SELECT
          cc.collection_id,
          cc.card_id,
          c.url,
          cc.added_by
        FROM collection_cards cc
        INNER JOIN cards c ON cc.card_id = c.id
        INNER JOIN collections col ON cc.collection_id = col.id
        WHERE c.type = 'URL'
          AND c.url IS NOT NULL
          AND (
            col.author_id = ${userId}
            OR col.id::text IN (
              SELECT target_id FROM follows
              WHERE follower_id = ${userId} AND target_type = 'collection'
            )
          )
      `);

      return results.map((row) => ({
        id: `collection-url:${row.collection_id}:${row.url}`,
        source: `collection:${row.collection_id}`,
        target: `url:${row.url}`,
        type: 'COLLECTION_CONTAINS_URL' as const,
        metadata: {
          addedBy: row.added_by,
        },
      }));
    }

    // Global graph: all collection-URL edges
    const results = await this.db
      .select({
        collectionId: collectionCards.collectionId,
        cardId: collectionCards.cardId,
        url: cards.url,
        addedBy: collectionCards.addedBy,
      })
      .from(collectionCards)
      .innerJoin(cards, eq(collectionCards.cardId, cards.id))
      .where(and(eq(cards.type, 'URL'), sql`${cards.url} IS NOT NULL`));

    return results.map((row) => ({
      id: `collection-url:${row.collectionId}:${row.url}`,
      source: `collection:${row.collectionId}`,
      target: `url:${row.url}`,
      type: 'COLLECTION_CONTAINS_URL' as const,
      metadata: {
        addedBy: row.addedBy,
      },
    }));
  }

  private async getUrlConnectionEdges(
    userId?: string,
  ): Promise<GraphEdgeDTO[]> {
    const whereConditions = [
      eq(connections.sourceType, 'URL'),
      eq(connections.targetType, 'URL'),
    ];
    if (userId) {
      // Only include connections curated by the target user
      whereConditions.push(eq(connections.curatorId, userId));
    }

    const results = await this.db
      .select({
        id: connections.id,
        sourceValue: connections.sourceValue,
        targetValue: connections.targetValue,
        connectionType: connections.connectionType,
        note: connections.note,
        curatorId: connections.curatorId,
      })
      .from(connections)
      .where(and(...whereConditions));

    return results.map((row) => ({
      id: `connection:${row.id}`,
      source: `url:${row.sourceValue}`,
      target: `url:${row.targetValue}`,
      type: 'URL_CONNECTS_URL' as const,
      metadata: {
        connectionType: row.connectionType,
        note: row.note,
        curatorId: row.curatorId,
      },
    }));
  }
}
