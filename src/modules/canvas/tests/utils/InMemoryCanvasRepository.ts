import { randomBytes, randomUUID } from 'crypto';
import type {
  CanvasRecord,
  ICanvasRepository,
  SaveResult,
} from '../../domain/ICanvasRepository';
import type { ICanvasObjectStore } from '../../domain/ICanvasObjectStore';
import { InMemoryCanvasObjectStore } from './InMemoryCanvasObjectStore';
import { DEFAULT_CANVAS_NAME } from '@semble/types';

const documentKey = (id: string, save: string) =>
  `canvases/${id}/documents/${save}.json`;
const thumbnailKey = (id: string) => `canvases/${id}/thumbnail.jpg`;

// The mock-repos and unit-test stand-in for DrizzleCanvasRepository. One
// instance per process (getInstance), so separate constructs share boards.
export class InMemoryCanvasRepository implements ICanvasRepository {
  private static instance: InMemoryCanvasRepository;

  private records = new Map<
    string,
    CanvasRecord & { documentKey: string | null; shareToken: string | null }
  >();

  static getInstance(
    objects: ICanvasObjectStore = new InMemoryCanvasObjectStore(),
  ) {
    this.instance ??= new InMemoryCanvasRepository(objects);
    return this.instance;
  }

  private constructor(private objects: ICanvasObjectStore) {}

  async create(ownerDid: string, id: string = randomUUID(), name?: string) {
    const now = new Date().toISOString();
    const record = {
      id,
      ownerDid,
      name: name ?? DEFAULT_CANVAS_NAME,
      tldrawVersion: '',
      linkCount: 0,
      revision: 0,
      schemaSequences: {} as Record<string, number>,
      hasThumbnail: false,
      sharedAt: null,
      createdAt: now,
      updatedAt: now,
      documentKey: null,
      shareToken: null,
    };
    const existing = this.records.get(id);
    if (!existing) this.records.set(id, record);
    const stored = existing ?? record;
    // An offline create retried under another owner is not the same board
    if (stored.ownerDid !== ownerDid) throw new Error(`Canvas ${id} not found`);
    const { documentKey: _ignored, ...out } = stored;
    return out;
  }

  async list(ownerDid: string) {
    return [...this.records.values()]
      .filter((record) => record.ownerDid === ownerDid)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map(this.strip);
  }

  async get(ownerDid: string, id: string) {
    const record = this.records.get(id);
    return record && record.ownerDid === ownerDid ? this.strip(record) : null;
  }

  async rename(ownerDid: string, id: string, name: string) {
    const record = this.records.get(id);
    if (!record || record.ownerDid !== ownerDid) return null;
    record.name = name;
    record.updatedAt = new Date().toISOString();
    return this.strip(record);
  }

  async duplicate(ownerDid: string, id: string) {
    const source = this.records.get(id);
    if (!source || source.ownerDid !== ownerDid) return null;
    const copyId = randomUUID();
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
    const now = new Date().toISOString();
    const copy = {
      ...source,
      id: copyId,
      name: `Copy of ${source.name}`,
      revision: 0,
      sharedAt: null,
      createdAt: now,
      updatedAt: now,
      documentKey: copyDocumentKey,
      shareToken: null,
    };
    this.records.set(copyId, copy);
    return this.strip(copy);
  }

  async delete(ownerDid: string, id: string) {
    const record = this.records.get(id);
    if (!record || record.ownerDid !== ownerDid) return false;
    this.records.delete(id);
    await this.objects.deletePrefix(`canvases/${id}/`);
    return true;
  }

  async open(ownerDid: string, id: string) {
    const record = this.records.get(id);
    if (!record || record.ownerDid !== ownerDid) return null;
    const document = record.documentKey
      ? await this.objects.get(record.documentKey)
      : null;
    return { record: this.strip(record), document };
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
    const record = this.records.get(id);
    if (!record || record.ownerDid !== ownerDid) {
      throw new Error(`Canvas ${id} not found`);
    }
    if (record.revision !== baseRevision) {
      return { conflict: true, currentRevision: record.revision };
    }
    const key = documentKey(id, randomUUID());
    await this.objects.put(key, document, 'application/json');
    record.revision = baseRevision + 1;
    record.documentKey = key;
    record.tldrawVersion = update.tldrawVersion;
    record.linkCount = update.linkCount;
    record.schemaSequences = update.schemaSequences;
    record.updatedAt = new Date().toISOString();
    return {
      conflict: false,
      revision: record.revision,
      updatedAt: new Date(record.updatedAt),
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
    const record = this.records.get(id);
    if (record) record.hasThumbnail = thumbnail !== null;
  }

  async share(ownerDid: string, id: string) {
    const record = this.records.get(id);
    if (!record || record.ownerDid !== ownerDid) return null;
    if (!record.shareToken) {
      record.shareToken = randomBytes(18).toString('base64url');
      record.sharedAt = new Date().toISOString();
    }
    return { record: this.strip(record), shareToken: record.shareToken };
  }

  async unshare(ownerDid: string, id: string) {
    const record = this.records.get(id);
    if (!record || record.ownerDid !== ownerDid) return null;
    record.shareToken = null;
    record.sharedAt = null;
    return this.strip(record);
  }

  async openShared(shareToken: string) {
    const record = [...this.records.values()].find(
      ({ shareToken: token }) => token === shareToken,
    );
    if (!record) return null;
    const document = record.documentKey
      ? await this.objects.get(record.documentKey)
      : null;
    return { record: this.strip(record), document };
  }

  private strip(
    record: CanvasRecord & {
      documentKey: string | null;
      shareToken: string | null;
    },
  ) {
    const { documentKey: _ignored, shareToken: _secret, ...out } = record;
    return out;
  }
}
