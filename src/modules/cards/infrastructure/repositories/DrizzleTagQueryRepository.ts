import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { and, count, desc, eq, isNotNull, sql, SQL } from 'drizzle-orm';
import { sqlTagBoundaryPattern } from '@semble/types';
import {
  ITagQueryRepository,
  RecentTextDTO,
  TaggedCardResultDTO,
  TagQueryOptions,
} from '../../domain/ITagQueryRepository';
import { PaginatedQueryResult } from '../../domain/ICardQueryRepository';
import { ConnectionForUserDTO } from '../../domain/IConnectionQueryRepository';
import { CollectionQueryResultDTO } from '../../domain/ICollectionQueryRepository';
import { ConnectionTypeEnum } from '../../domain/value-objects/ConnectionType';
import { cards } from './schema/card.sql';
import { connections } from './schema/connection.sql';
import { collections } from './schema/collection.sql';
import { publishedRecords } from './schema/publishedRecord.sql';

const noteText = sql<string>`${cards.contentData}->>'text'`;

export class DrizzleTagQueryRepository implements ITagQueryRepository {
  constructor(private db: PostgresJsDatabase) {}

  async getRecentTexts(options: {
    userDid?: string;
    limitPerSource: number;
  }): Promise<RecentTextDTO[]> {
    const { userDid, limitPerSource } = options;

    const noteConditions: SQL[] = [eq(cards.type, 'NOTE')];
    const connectionConditions: SQL[] = [isNotNull(connections.note)];
    const collectionConditions: SQL[] = [isNotNull(collections.description)];
    if (userDid) {
      noteConditions.push(eq(cards.authorId, userDid));
      connectionConditions.push(eq(connections.curatorId, userDid));
      collectionConditions.push(eq(collections.authorId, userDid));
    }

    const [notes, connectionNotes, descriptions] = await Promise.all([
      this.db
        .select({ text: noteText, createdAt: cards.createdAt })
        .from(cards)
        .where(and(...noteConditions))
        .orderBy(desc(cards.createdAt))
        .limit(limitPerSource),
      this.db
        .select({ text: connections.note, createdAt: connections.createdAt })
        .from(connections)
        .where(and(...connectionConditions))
        .orderBy(desc(connections.createdAt))
        .limit(limitPerSource),
      this.db
        .select({
          text: collections.description,
          createdAt: collections.createdAt,
        })
        .from(collections)
        .where(and(...collectionConditions))
        .orderBy(desc(collections.createdAt))
        .limit(limitPerSource),
    ]);

    return [...notes, ...connectionNotes, ...descriptions]
      .filter((row): row is { text: string; createdAt: Date } => !!row.text)
      .map((row) => ({ text: row.text, createdAt: row.createdAt }));
  }

  async getTaggedCards(
    tag: string,
    options: TagQueryOptions,
  ): Promise<PaginatedQueryResult<TaggedCardResultDTO>> {
    const { page, limit, userDid } = options;
    const offset = (page - 1) * limit;
    const pattern = sqlTagBoundaryPattern(tag);

    const conditions: SQL[] = [
      eq(cards.type, 'NOTE'),
      isNotNull(cards.parentCardId),
      sql`${noteText} ~* ${pattern}`,
    ];
    if (userDid) {
      conditions.push(eq(cards.authorId, userDid));
    }
    const whereClause = and(...conditions);

    const [rows, countResult] = await Promise.all([
      this.db
        .select({
          parentCardId: cards.parentCardId,
          noteCreatedAt: cards.createdAt,
        })
        .from(cards)
        .where(whereClause)
        .orderBy(desc(cards.createdAt))
        .limit(limit)
        .offset(offset),
      this.db.select({ count: count() }).from(cards).where(whereClause),
    ]);

    const totalCount = countResult[0]?.count || 0;

    return {
      items: rows.map((row) => ({
        parentCardId: row.parentCardId as string,
        noteCreatedAt: row.noteCreatedAt,
      })),
      totalCount,
      hasMore: offset + rows.length < totalCount,
    };
  }

  async getTaggedConnections(
    tag: string,
    options: TagQueryOptions,
  ): Promise<PaginatedQueryResult<ConnectionForUserDTO>> {
    const { page, limit, userDid } = options;
    const offset = (page - 1) * limit;
    const pattern = sqlTagBoundaryPattern(tag);

    const conditions: SQL[] = [
      // Only URL-to-URL connections are renderable today (matches
      // ConnectionQueryService.getConnectionsForUser)
      eq(connections.sourceType, 'URL'),
      eq(connections.targetType, 'URL'),
      sql`${connections.note} ~* ${pattern}`,
    ];
    if (userDid) {
      conditions.push(eq(connections.curatorId, userDid));
    }
    const whereClause = and(...conditions);

    const [rows, countResult] = await Promise.all([
      this.db
        .select({
          id: connections.id,
          curatorId: connections.curatorId,
          sourceValue: connections.sourceValue,
          sourceUrlMetadata: connections.sourceUrlMetadata,
          targetValue: connections.targetValue,
          targetUrlMetadata: connections.targetUrlMetadata,
          connectionType: connections.connectionType,
          note: connections.note,
          createdAt: connections.createdAt,
          updatedAt: connections.updatedAt,
        })
        .from(connections)
        .where(whereClause)
        .orderBy(desc(connections.createdAt))
        .limit(limit)
        .offset(offset),
      this.db.select({ count: count() }).from(connections).where(whereClause),
    ]);

    const totalCount = countResult[0]?.count || 0;

    return {
      items: rows.map((row) => ({
        connection: {
          id: row.id,
          type: (row.connectionType as ConnectionTypeEnum) || undefined,
          note: row.note || undefined,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          curatorId: row.curatorId,
        },
        sourceUrl: row.sourceValue,
        sourceUrlMetadata: row.sourceUrlMetadata || undefined,
        targetUrl: row.targetValue,
        targetUrlMetadata: row.targetUrlMetadata || undefined,
      })),
      totalCount,
      hasMore: offset + rows.length < totalCount,
    };
  }

  async getTaggedCollections(
    tag: string,
    options: TagQueryOptions,
  ): Promise<PaginatedQueryResult<CollectionQueryResultDTO>> {
    const { page, limit, userDid } = options;
    const offset = (page - 1) * limit;
    const pattern = sqlTagBoundaryPattern(tag);

    const conditions: SQL[] = [sql`${collections.description} ~* ${pattern}`];
    if (userDid) {
      conditions.push(eq(collections.authorId, userDid));
    }
    const whereClause = and(...conditions);

    const [rows, countResult] = await Promise.all([
      this.db
        .select({
          id: collections.id,
          name: collections.name,
          description: collections.description,
          accessType: collections.accessType,
          cardCount: collections.cardCount,
          createdAt: collections.createdAt,
          updatedAt: collections.updatedAt,
          authorId: collections.authorId,
          uri: publishedRecords.uri,
        })
        .from(collections)
        .leftJoin(
          publishedRecords,
          eq(collections.publishedRecordId, publishedRecords.id),
        )
        .where(whereClause)
        .orderBy(desc(collections.createdAt))
        .limit(limit)
        .offset(offset),
      this.db.select({ count: count() }).from(collections).where(whereClause),
    ]);

    const totalCount = countResult[0]?.count || 0;

    return {
      items: rows.map((row) => ({
        id: row.id,
        uri: row.uri || undefined,
        name: row.name,
        description: row.description || undefined,
        accessType: row.accessType,
        updatedAt: row.updatedAt,
        createdAt: row.createdAt,
        cardCount: row.cardCount,
        authorId: row.authorId,
      })),
      totalCount,
      hasMore: offset + rows.length < totalCount,
    };
  }
}
