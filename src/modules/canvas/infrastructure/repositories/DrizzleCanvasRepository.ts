import { and, desc, eq } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { randomUUID } from 'crypto';
import type {
  CanvasRecord,
  ICanvasRepository,
  SaveResult,
} from '../../domain/ICanvasRepository';
import type { ICanvasObjectStore } from '../../domain/ICanvasObjectStore';
import { canvases } from './schema/canvas.sql';
import { publishedRecords } from 'src/modules/cards/infrastructure/repositories/schema/publishedRecord.sql';
import { DEFAULT_CANVAS_NAME } from '@semble/types';

export class CanvasNotFoundError extends Error {
  constructor(id: string) {
    super(`Canvas ${id} doesn't exist`);
  }
}

type Row = typeof canvases.$inferSelect;

const toRecord = (row: Row): CanvasRecord => ({
  id: row.id,
  ownerDid: row.ownerDid,
  name: row.name,
  tldrawVersion: row.tldrawVersion,
  linkCount: row.linkCount,
  revision: row.revision,
  schemaSequences: row.schemaSequences,
  hasThumbnail: row.hasThumbnail,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

const documentKey = (id: string, save: string) =>
  `canvases/${id}/documents/${save}.json`;

const thumbnailKey = (id: string) => `canvases/${id}/thumbnail.jpg`;

export class DrizzleCanvasRepository implements ICanvasRepository {
  constructor(
    private db: PostgresJsDatabase,
    private objects: ICanvasObjectStore,
  ) {}

  async create(ownerDid: string, id: string = randomUUID(), name?: string) {
    const [row] = await this.db
      .insert(canvases)
      .values({
        id,
        ownerDid,
        name: name ?? DEFAULT_CANVAS_NAME,
        tldrawVersion: '',
        linkCount: 0,
        revision: 0,
        schemaSequences: {},
        hasThumbnail: false,
      })
      .onConflictDoNothing()
      .returning();
    // A client-supplied id that already exists is the same board being
    // created twice (an offline create retried); return what's stored
    if (row) return toRecord(row);
    const existing = await this.get(ownerDid, id);
    if (!existing) throw new CanvasNotFoundError(id);
    return existing;
  }

  async list(ownerDid: string) {
    const rows = await this.db
      .select()
      .from(canvases)
      .where(eq(canvases.ownerDid, ownerDid))
      .orderBy(desc(canvases.updatedAt));
    return rows.map(toRecord);
  }

  async get(ownerDid: string, id: string) {
    const [row] = await this.db
      .select()
      .from(canvases)
      .where(and(eq(canvases.id, id), eq(canvases.ownerDid, ownerDid)));
    return row ? toRecord(row) : null;
  }

  async rename(ownerDid: string, id: string, name: string) {
    const [row] = await this.db
      .update(canvases)
      .set({ name, updatedAt: new Date() })
      .where(and(eq(canvases.id, id), eq(canvases.ownerDid, ownerDid)))
      .returning();
    return row ? toRecord(row) : null;
  }

  async duplicate(ownerDid: string, id: string) {
    const [source] = await this.db
      .select()
      .from(canvases)
      .where(and(eq(canvases.id, id), eq(canvases.ownerDid, ownerDid)));
    if (!source) return null;

    const copyId = randomUUID();
    // The copy's revision restarts: it's a new board that happens to start
    // with the source's document
    let copyDocumentKey: string | null = null;
    if (source.documentKey) {
      const document = await this.objects.get(source.documentKey);
      if (document) {
        copyDocumentKey = documentKey(copyId, randomUUID());
        await this.objects.put(copyDocumentKey, document, 'application/json');
      }
    }
    if (source.hasThumbnail) {
      const thumbnail = await this.objects.get(thumbnailKey(id));
      if (thumbnail) {
        await this.objects.put(thumbnailKey(copyId), thumbnail, 'image/jpeg');
      }
    }
    const [row] = await this.db
      .insert(canvases)
      .values({
        id: copyId,
        ownerDid,
        name: `Copy of ${source.name}`,
        tldrawVersion: source.tldrawVersion,
        linkCount: source.linkCount,
        revision: 0,
        schemaSequences: source.schemaSequences,
        documentKey: copyDocumentKey,
        hasThumbnail: source.hasThumbnail,
      })
      .returning();
    if (!row) throw new CanvasNotFoundError(copyId);
    return toRecord(row);
  }

  async delete(ownerDid: string, id: string) {
    const rows = await this.db
      .delete(canvases)
      .where(and(eq(canvases.id, id), eq(canvases.ownerDid, ownerDid)))
      .returning({ id: canvases.id });
    if (rows.length === 0) return false;
    // Best effort: an orphaned prefix is harmless and unreferenced
    await this.objects.deletePrefix(`canvases/${id}/`).catch(() => {});
    return true;
  }

  async open(ownerDid: string, id: string) {
    const [row] = await this.db
      .select()
      .from(canvases)
      .where(and(eq(canvases.id, id), eq(canvases.ownerDid, ownerDid)));
    if (!row) return null;
    const document = row.documentKey
      ? await this.objects.get(row.documentKey)
      : null;
    return { record: toRecord(row), document };
  }

  async save(
    ownerDid: string,
    id: string,
    baseRevision: number,
    document: Buffer,
    update: {
      tldrawVersion: string;
      linkCount: number;
      schemaSequences: Record<string, number>;
    },
  ): Promise<SaveResult> {
    // Per-save keys, so a writer whose claim fails can never have its bytes
    // under the key another revision points at
    const key = documentKey(id, randomUUID());
    await this.objects.put(key, document, 'application/json');

    const rows = await this.db
      .update(canvases)
      .set({
        revision: baseRevision + 1,
        documentKey: key,
        tldrawVersion: update.tldrawVersion,
        linkCount: update.linkCount,
        schemaSequences: update.schemaSequences,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(canvases.id, id),
          eq(canvases.ownerDid, ownerDid),
          eq(canvases.revision, baseRevision),
        ),
      )
      .returning({
        revision: canvases.revision,
        updatedAt: canvases.updatedAt,
      });

    if (rows.length === 0) {
      // Losing writer: its object is orphaned unless removed now
      await this.objects.delete(key).catch(() => {});
      const [row] = await this.db
        .select({ revision: canvases.revision })
        .from(canvases)
        .where(eq(canvases.id, id));
      if (!row) throw new CanvasNotFoundError(id);
      return { conflict: true, currentRevision: row.revision };
    }
    const saved = rows[0];
    if (!saved) throw new CanvasNotFoundError(id);
    return {
      conflict: false,
      revision: saved.revision,
      updatedAt: saved.updatedAt,
    };
  }

  async getThumbnail(id: string) {
    return this.objects.get(thumbnailKey(id));
  }

  async saveThumbnail(id: string, thumbnail: Buffer | null) {
    if (thumbnail) {
      await this.objects.put(thumbnailKey(id), thumbnail, 'image/jpeg');
    } else {
      await this.objects.delete(thumbnailKey(id));
    }
    // Thumbnails don't reorder the list, so updatedAt is left alone
    await this.db
      .update(canvases)
      .set({ hasThumbnail: thumbnail !== null })
      .where(eq(canvases.id, id));
  }

  async getPublishedRecord(ownerDid: string, id: string) {
    const [row] = await this.db
      .select({ uri: publishedRecords.uri, cid: publishedRecords.cid })
      .from(canvases)
      .innerJoin(
        publishedRecords,
        eq(canvases.publishedRecordId, publishedRecords.id),
      )
      .where(and(eq(canvases.id, id), eq(canvases.ownerDid, ownerDid)));
    return row ?? null;
  }

  async setPublishedRecord(id: string, record: { uri: string; cid: string }) {
    // putRecord mints a new cid on every update, so each publish is a new
    // published_records row; the board points at the latest
    const [inserted] = await this.db
      .insert(publishedRecords)
      .values({ id: randomUUID(), uri: record.uri, cid: record.cid })
      .onConflictDoNothing({
        target: [publishedRecords.uri, publishedRecords.cid],
      })
      .returning({ id: publishedRecords.id });

    let publishedRecordId = inserted?.id;
    if (!publishedRecordId) {
      const [existing] = await this.db
        .select({ id: publishedRecords.id })
        .from(publishedRecords)
        .where(
          and(
            eq(publishedRecords.uri, record.uri),
            eq(publishedRecords.cid, record.cid),
          ),
        );
      publishedRecordId = existing?.id;
    }

    await this.db
      .update(canvases)
      .set({ publishedRecordId })
      .where(eq(canvases.id, id));
  }
}
