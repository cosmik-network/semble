import type {
  CanvasDocument,
  CanvasRecord,
  CanvasSummary,
} from '@semble/types';
import type {
  ICanvasRepository,
  SaveResult,
} from '../domain/ICanvasRepository';
import { CanvasNotFoundError } from '../infrastructure/repositories/DrizzleCanvasRepository';

export class CanvasNotOwnedError extends Error {
  constructor(id: string) {
    super(`Canvas ${id} not found`);
  }
}

const parseDataUrl = (dataUrl: string) => {
  const match = /^data:image\/[a-z]+;base64,(.+)$/.exec(dataUrl);
  if (!match) throw new Error('Not a base64 image data URL');
  return Buffer.from(match[1]!, 'base64');
};

// Thin application layer over the repository: every operation is scoped to
// an owner, and document/thumbnail bytes are decoded from what the routes
// carry. Controllers never touch the repository directly.
export class CanvasService {
  constructor(private repository: ICanvasRepository) {}

  async create(ownerDid: string, id?: string, name?: string) {
    try {
      return await this.repository.create(ownerDid, id, name);
    } catch (error) {
      // A client-supplied id that exists under another owner
      if (error instanceof CanvasNotFoundError)
        throw new CanvasNotOwnedError(id!);
      throw error;
    }
  }

  async list(
    ownerDid: string,
    includeThumbnails: boolean,
  ): Promise<CanvasSummary[]> {
    const records = await this.repository.list(ownerDid);
    return Promise.all(
      records.map(async (record) => ({
        ...record,
        thumbnail:
          includeThumbnails && record.hasThumbnail
            ? await this.thumbnail(ownerDid, record.id)
            : null,
      })),
    );
  }

  async get(ownerDid: string, id: string) {
    return this.owned(ownerDid, id);
  }

  async rename(ownerDid: string, id: string, name: string) {
    const renamed = await this.repository.rename(ownerDid, id, name);
    if (!renamed) throw new CanvasNotOwnedError(id);
    return renamed;
  }

  async duplicate(ownerDid: string, id: string) {
    const copy = await this.repository.duplicate(ownerDid, id);
    if (!copy) throw new CanvasNotOwnedError(id);
    return copy;
  }

  async delete(ownerDid: string, id: string) {
    const deleted = await this.repository.delete(ownerDid, id);
    if (!deleted) throw new CanvasNotOwnedError(id);
  }

  async open(
    ownerDid: string,
    id: string,
  ): Promise<{
    record: CanvasRecord;
    document: CanvasDocument | null;
  }> {
    const opened = await this.repository.open(ownerDid, id);
    if (!opened) throw new CanvasNotOwnedError(id);
    const document: CanvasDocument | null = opened.document
      ? (JSON.parse(opened.document.toString('utf8')) as CanvasDocument)
      : null;
    return { record: opened.record, document };
  }

  async save(
    ownerDid: string,
    id: string,
    baseRevision: number,
    document: CanvasDocument,
    linkCount: number,
    tldrawVersion: string,
  ): Promise<SaveResult> {
    // Verify ownership before writing bytes: save's conditional update
    // checks it too, but the object would already be written
    const existing = await this.repository.get(ownerDid, id);
    if (!existing) throw new CanvasNotOwnedError(id);
    return this.repository.save(
      ownerDid,
      id,
      baseRevision,
      Buffer.from(JSON.stringify(document), 'utf8'),
      {
        tldrawVersion,
        linkCount,
        schemaSequences: document.schema.sequences,
      },
    );
  }

  async saveThumbnail(ownerDid: string, id: string, thumbnail: string | null) {
    const existing = await this.repository.get(ownerDid, id);
    if (!existing) throw new CanvasNotOwnedError(id);
    await this.repository.saveThumbnail(
      id,
      thumbnail ? parseDataUrl(thumbnail) : null,
    );
  }

  async thumbnail(ownerDid: string, id: string) {
    const existing = await this.repository.get(ownerDid, id);
    if (!existing) throw new CanvasNotOwnedError(id);
    const bytes = await this.repository.getThumbnail(id);
    return bytes ? `data:image/jpeg;base64,${bytes.toString('base64')}` : null;
  }

  async share(ownerDid: string, id: string) {
    const shared = await this.repository.share(ownerDid, id);
    if (!shared) throw new CanvasNotOwnedError(id);
    return shared;
  }

  async unshare(ownerDid: string, id: string) {
    const record = await this.repository.unshare(ownerDid, id);
    if (!record) throw new CanvasNotOwnedError(id);
    return record;
  }

  async openShared(shareToken: string) {
    const opened = await this.repository.openShared(shareToken);
    if (!opened) throw new CanvasNotOwnedError(shareToken);
    const document: CanvasDocument | null = opened.document
      ? (JSON.parse(opened.document.toString('utf8')) as CanvasDocument)
      : null;
    return { record: opened.record, document };
  }

  async sharedThumbnail(shareToken: string) {
    const opened = await this.repository.openShared(shareToken);
    if (!opened) throw new CanvasNotOwnedError(shareToken);
    if (!opened.record.hasThumbnail) return null;
    const bytes = await this.repository.getThumbnail(opened.record.id);
    return bytes ? `data:image/jpeg;base64,${bytes.toString('base64')}` : null;
  }

  private async owned(ownerDid: string, id: string) {
    const record = await this.repository.get(ownerDid, id);
    if (!record) throw new CanvasNotOwnedError(id);
    return record;
  }
}
