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
import { follows } from '../../../../user/infrastructure/repositories/schema/follows.sql';
import { users } from '../../../../user/infrastructure/repositories/schema/user.sql';

export class GraphQueryService {
  constructor(private db: PostgresJsDatabase) {}

  async getGraphData(
    page: number = 1,
    limit: number = 300,
    userId?: string,
  ): Promise<GraphDataDTO> {
    // Fetch all data in parallel
    const [
      userNodes,
      urlNodes,
      collectionNodes,
      noteNodes,
      userFollowEdges,
      collectionFollowEdges,
      authorshipEdges,
      noteUrlEdges,
      collectionUrlEdges,
      urlConnectionEdges,
    ] = await Promise.all([
      this.getUserNodes(userId),
      this.getUrlNodes(userId),
      this.getCollectionNodes(userId),
      this.getNoteNodes(userId),
      this.getUserFollowEdges(userId),
      this.getCollectionFollowEdges(userId),
      this.getAuthorshipEdges(userId),
      this.getNoteUrlEdges(userId),
      this.getCollectionUrlEdges(userId),
      this.getUrlConnectionEdges(userId),
    ]);

    // Combine all nodes
    const allNodes = [
      ...userNodes,
      ...urlNodes,
      ...collectionNodes,
      ...noteNodes,
    ];
    const totalNodeCount = allNodes.length;

    // Apply pagination to nodes
    const offset = (page - 1) * limit;
    const paginatedNodes = allNodes.slice(offset, offset + limit);

    // Create a Set of loaded node IDs for efficient lookup
    const loadedNodeIds = new Set(paginatedNodes.map((node) => node.id));

    // Filter edges to only include those where BOTH source and target are in loaded nodes
    const allEdges = [
      ...userFollowEdges,
      ...collectionFollowEdges,
      ...authorshipEdges,
      ...noteUrlEdges,
      ...collectionUrlEdges,
      ...urlConnectionEdges,
    ];

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

  private async getUserNodes(userId?: string): Promise<GraphNodeDTO[]> {
    // Query all unique DIDs from all sources in the graph
    // Use LEFT JOIN with users table to get handles where available
    // If userId is provided, filter to only include relevant DIDs
    const results = await this.db.execute<{
      id: string;
      handle: string | null;
    }>(
      userId
        ? sql`
      WITH all_dids AS (
        -- The target user themselves
        SELECT ${userId} as did
        UNION
        -- Users the target user authored cards with
        SELECT DISTINCT author_id as did FROM cards WHERE author_id = ${userId}
        UNION
        -- Users the target user follows
        SELECT DISTINCT target_id as did FROM follows
        WHERE follower_id = ${userId} AND target_type = 'user'
        UNION
        -- Users who follow the target user (for bidirectional context)
        SELECT DISTINCT follower_id as did FROM follows
        WHERE target_id = ${userId} AND target_type = 'user'
        UNION
        -- Curators of connections the target user created
        SELECT DISTINCT curator_id as did FROM connections WHERE curator_id = ${userId}
        UNION
        -- Users who contributed to the target user's collections
        SELECT DISTINCT added_by as did FROM collection_cards
        WHERE collection_id IN (SELECT id FROM collections WHERE author_id = ${userId})
        UNION
        -- Authors of collections the target user follows
        SELECT DISTINCT author_id as did FROM collections
        WHERE id::text IN (SELECT target_id FROM follows WHERE follower_id = ${userId} AND target_type = 'collection')
      )
      SELECT
        all_dids.did as id,
        users.handle as handle
      FROM all_dids
      LEFT JOIN users ON all_dids.did = users.id
    `
        : sql`
      WITH all_dids AS (
        SELECT DISTINCT author_id as did FROM cards
        UNION
        SELECT DISTINCT follower_id as did FROM follows
        UNION
        SELECT DISTINCT target_id as did FROM follows WHERE target_type = 'user'
        UNION
        SELECT DISTINCT curator_id as did FROM connections
        UNION
        SELECT DISTINCT added_by as did FROM collection_cards
        UNION
        SELECT DISTINCT author_id as did FROM collections
      )
      SELECT
        all_dids.did as id,
        users.handle as handle
      FROM all_dids
      LEFT JOIN users ON all_dids.did = users.id
    `,
    );

    return results.map((row) => ({
      id: `user:${row.id}`,
      type: 'USER' as const,
      label: row.handle || row.id,
      metadata: {
        did: row.id,
        handle: row.handle,
      },
    }));
  }

  private async getUrlNodes(userId?: string): Promise<GraphNodeDTO[]> {
    if (userId) {
      // For user-scoped graph: include URLs authored by user OR in their connections
      const results = await this.db.execute<{
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

      return results.map((row) => {
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
      });
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

  private async getNoteNodes(userId?: string): Promise<GraphNodeDTO[]> {
    const whereConditions = [eq(cards.type, 'NOTE')];
    if (userId) {
      whereConditions.push(eq(cards.authorId, userId));
    }

    const results = await this.db
      .select({
        id: cards.id,
        contentData: cards.contentData,
        authorId: cards.authorId,
      })
      .from(cards)
      .where(and(...whereConditions));

    return results.map((row) => {
      const contentData = row.contentData as any;
      const noteText = contentData?.note || '';
      const preview =
        noteText.substring(0, 50) + (noteText.length > 50 ? '...' : '');

      return {
        id: `note:${row.id}`,
        type: 'NOTE' as const,
        label: preview || 'Note',
        metadata: {
          cardId: row.id,
          note: noteText,
          authorId: row.authorId,
        },
      };
    });
  }

  private async getUserFollowEdges(userId?: string): Promise<GraphEdgeDTO[]> {
    const whereConditions = [eq(follows.targetType, 'user')];
    if (userId) {
      // Include follows where user is follower OR target (bidirectional)
      whereConditions.push(
        sql`(${follows.followerId} = ${userId} OR ${follows.targetId} = ${userId})`,
      );
    }

    const results = await this.db
      .select({
        followerId: follows.followerId,
        targetId: follows.targetId,
      })
      .from(follows)
      .where(and(...whereConditions));

    return results.map((row) => ({
      id: `follow-user:${row.followerId}:${row.targetId}`,
      source: `user:${row.followerId}`,
      target: `user:${row.targetId}`,
      type: 'USER_FOLLOWS_USER' as const,
      metadata: {},
    }));
  }

  private async getCollectionFollowEdges(
    userId?: string,
  ): Promise<GraphEdgeDTO[]> {
    const whereConditions = [eq(follows.targetType, 'collection')];
    if (userId) {
      // Only include follows by the target user
      whereConditions.push(eq(follows.followerId, userId));
    }

    const results = await this.db
      .select({
        followerId: follows.followerId,
        targetId: follows.targetId,
      })
      .from(follows)
      .where(and(...whereConditions));

    return results.map((row) => ({
      id: `follow-collection:${row.followerId}:${row.targetId}`,
      source: `user:${row.followerId}`,
      target: `collection:${row.targetId}`,
      type: 'USER_FOLLOWS_COLLECTION' as const,
      metadata: {},
    }));
  }

  private async getAuthorshipEdges(userId?: string): Promise<GraphEdgeDTO[]> {
    const whereConditions = [
      eq(cards.type, 'URL'),
      sql`${cards.url} IS NOT NULL`,
    ];
    if (userId) {
      whereConditions.push(eq(cards.authorId, userId));
    }

    const results = await this.db
      .select({
        authorId: cards.authorId,
        url: cards.url,
      })
      .from(cards)
      .where(and(...whereConditions));

    return results.map((row) => ({
      id: `authorship:${row.authorId}:${row.url}`,
      source: `user:${row.authorId}`,
      target: `url:${row.url}`,
      type: 'USER_AUTHORED_URL' as const,
      metadata: {},
    }));
  }

  private async getNoteUrlEdges(userId?: string): Promise<GraphEdgeDTO[]> {
    // Join notes with their parent URL cards using raw SQL for self-join
    const results = await this.db.execute<{
      note_id: string;
      parent_url: string;
    }>(
      userId
        ? sql`
      SELECT
        note_cards.id as note_id,
        parent_cards.url as parent_url
      FROM cards as note_cards
      INNER JOIN cards as parent_cards
        ON note_cards.parent_card_id = parent_cards.id
        AND parent_cards.type = 'URL'
      WHERE note_cards.type = 'NOTE'
        AND note_cards.author_id = ${userId}
        AND parent_cards.url IS NOT NULL
    `
        : sql`
      SELECT
        note_cards.id as note_id,
        parent_cards.url as parent_url
      FROM cards as note_cards
      INNER JOIN cards as parent_cards
        ON note_cards.parent_card_id = parent_cards.id
        AND parent_cards.type = 'URL'
      WHERE note_cards.type = 'NOTE'
        AND parent_cards.url IS NOT NULL
    `,
    );

    return results.map((row) => ({
      id: `note-url:${row.note_id}:${row.parent_url}`,
      source: `note:${row.note_id}`,
      target: `url:${row.parent_url}`,
      type: 'NOTE_REFERENCES_URL' as const,
      metadata: {},
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
