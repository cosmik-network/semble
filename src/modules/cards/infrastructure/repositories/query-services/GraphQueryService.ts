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

  async getGraphData(): Promise<GraphDataDTO> {
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
      this.getUserNodes(),
      this.getUrlNodes(),
      this.getCollectionNodes(),
      this.getNoteNodes(),
      this.getUserFollowEdges(),
      this.getCollectionFollowEdges(),
      this.getAuthorshipEdges(),
      this.getNoteUrlEdges(),
      this.getCollectionUrlEdges(),
      this.getUrlConnectionEdges(),
    ]);

    // Combine all nodes and edges
    const nodes = [...userNodes, ...urlNodes, ...collectionNodes, ...noteNodes];

    const edges = [
      ...userFollowEdges,
      ...collectionFollowEdges,
      ...authorshipEdges,
      ...noteUrlEdges,
      ...collectionUrlEdges,
      ...urlConnectionEdges,
    ];

    return { nodes, edges };
  }

  private async getUserNodes(): Promise<GraphNodeDTO[]> {
    const results = await this.db
      .select({
        id: users.id,
        handle: users.handle,
      })
      .from(users);

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

  private async getUrlNodes(): Promise<GraphNodeDTO[]> {
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

  private async getCollectionNodes(): Promise<GraphNodeDTO[]> {
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

  private async getNoteNodes(): Promise<GraphNodeDTO[]> {
    const results = await this.db
      .select({
        id: cards.id,
        contentData: cards.contentData,
        authorId: cards.authorId,
      })
      .from(cards)
      .where(eq(cards.type, 'NOTE'));

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

  private async getUserFollowEdges(): Promise<GraphEdgeDTO[]> {
    const results = await this.db
      .select({
        followerId: follows.followerId,
        targetId: follows.targetId,
        createdAt: follows.createdAt,
      })
      .from(follows)
      .where(eq(follows.targetType, 'user'));

    return results.map((row) => ({
      id: `follow-user:${row.followerId}:${row.targetId}`,
      source: `user:${row.followerId}`,
      target: `user:${row.targetId}`,
      type: 'USER_FOLLOWS_USER' as const,
      metadata: {
        createdAt: row.createdAt.toISOString(),
      },
    }));
  }

  private async getCollectionFollowEdges(): Promise<GraphEdgeDTO[]> {
    const results = await this.db
      .select({
        followerId: follows.followerId,
        targetId: follows.targetId,
        createdAt: follows.createdAt,
      })
      .from(follows)
      .where(eq(follows.targetType, 'collection'));

    return results.map((row) => ({
      id: `follow-collection:${row.followerId}:${row.targetId}`,
      source: `user:${row.followerId}`,
      target: `collection:${row.targetId}`,
      type: 'USER_FOLLOWS_COLLECTION' as const,
      metadata: {
        createdAt: row.createdAt.toISOString(),
      },
    }));
  }

  private async getAuthorshipEdges(): Promise<GraphEdgeDTO[]> {
    const results = await this.db
      .select({
        authorId: cards.authorId,
        url: cards.url,
        createdAt: cards.createdAt,
      })
      .from(cards)
      .where(and(eq(cards.type, 'URL'), sql`${cards.url} IS NOT NULL`));

    return results.map((row) => ({
      id: `authorship:${row.authorId}:${row.url}`,
      source: `user:${row.authorId}`,
      target: `url:${row.url}`,
      type: 'USER_AUTHORED_URL' as const,
      metadata: {
        createdAt: row.createdAt.toISOString(),
      },
    }));
  }

  private async getNoteUrlEdges(): Promise<GraphEdgeDTO[]> {
    // Join notes with their parent URL cards using raw SQL for self-join
    const results = await this.db.execute<{
      note_id: string;
      parent_url: string;
      created_at: Date;
    }>(sql`
      SELECT
        note_cards.id as note_id,
        parent_cards.url as parent_url,
        note_cards.created_at
      FROM cards as note_cards
      INNER JOIN cards as parent_cards
        ON note_cards.parent_card_id = parent_cards.id
        AND parent_cards.type = 'URL'
      WHERE note_cards.type = 'NOTE'
        AND parent_cards.url IS NOT NULL
    `);

    return results.map((row) => ({
      id: `note-url:${row.note_id}:${row.parent_url}`,
      source: `note:${row.note_id}`,
      target: `url:${row.parent_url}`,
      type: 'NOTE_REFERENCES_URL' as const,
      metadata: {
        createdAt: row.created_at.toISOString(),
      },
    }));
  }

  private async getCollectionUrlEdges(): Promise<GraphEdgeDTO[]> {
    const results = await this.db
      .select({
        collectionId: collectionCards.collectionId,
        cardId: collectionCards.cardId,
        url: cards.url,
        addedAt: collectionCards.addedAt,
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
        addedAt: row.addedAt.toISOString(),
        addedBy: row.addedBy,
      },
    }));
  }

  private async getUrlConnectionEdges(): Promise<GraphEdgeDTO[]> {
    const results = await this.db
      .select({
        id: connections.id,
        sourceValue: connections.sourceValue,
        targetValue: connections.targetValue,
        connectionType: connections.connectionType,
        note: connections.note,
        curatorId: connections.curatorId,
        createdAt: connections.createdAt,
      })
      .from(connections)
      .where(
        and(
          eq(connections.sourceType, 'URL'),
          eq(connections.targetType, 'URL'),
        ),
      );

    return results.map((row) => ({
      id: `connection:${row.id}`,
      source: `url:${row.sourceValue}`,
      target: `url:${row.targetValue}`,
      type: 'URL_CONNECTS_URL' as const,
      metadata: {
        connectionType: row.connectionType,
        note: row.note,
        curatorId: row.curatorId,
        createdAt: row.createdAt.toISOString(),
      },
    }));
  }
}
