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
import { PublishedRecordId } from 'src/modules/cards/domain/value-objects/PublishedRecordId';
import { AuthenticationError } from 'src/shared/core/AuthenticationError';
import type { ICanvasPublisher } from './ports/ICanvasPublisher';

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
//
// Every board also gets a PDS record (name + URL only; the document never
// leaves object storage): created with the board, updated on rename, and
// deleted with it. Saves don't touch the PDS - the record carries no
// revision, so there is nothing to update.
export class CanvasService {
  constructor(
    private repository: ICanvasRepository,
    private publisher: ICanvasPublisher,
  ) {}

  async create(ownerDid: string, id?: string, name?: string) {
    try {
      const canvas = await this.repository.create(ownerDid, id, name);
      // An offline create retried returns the stored board; only the first
      // create publishes
      const existing = await this.repository.getPublishedRecord(
        ownerDid,
        canvas.id,
      );
      if (!existing) await this.publish(ownerDid, canvas);
      return canvas;
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
    // The name is part of the PDS record, so a rename rewrites it
    const existing = await this.repository.getPublishedRecord(ownerDid, id);
    if (existing) await this.publish(ownerDid, renamed, existing);
    return renamed;
  }

  async duplicate(ownerDid: string, id: string) {
    const copy = await this.repository.duplicate(ownerDid, id);
    if (!copy) throw new CanvasNotOwnedError(id);
    await this.publish(ownerDid, copy);
    return copy;
  }

  async delete(ownerDid: string, id: string) {
    // The PDS record outlives a deleted board, so remove it first: a failed
    // local delete can be retried, but an orphaned PDS record cannot be
    // reached again
    const existing = await this.repository.getPublishedRecord(ownerDid, id);
    if (existing) {
      const unpublishResult = await this.publisher.unpublish(
        PublishedRecordId.create(existing),
        ownerDid,
      );
      if (unpublishResult.isErr()) throw publishError(unpublishResult.error);
    }
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

  // Publishes (or, with existing, updates) the board's PDS record and stores
  // the resulting record id on the row
  private async publish(
    ownerDid: string,
    canvas: CanvasRecord,
    existing?: { uri: string; cid: string },
  ) {
    const publishResult = await this.publisher.publish(
      ownerDid,
      {
        canvasId: canvas.id,
        name: canvas.name,
        createdAt: canvas.createdAt,
      },
      existing ? PublishedRecordId.create(existing) : undefined,
    );
    if (publishResult.isErr()) throw publishError(publishResult.error);
    await this.repository.setPublishedRecord(
      canvas.id,
      publishResult.value.getValue(),
    );
  }

  private async owned(ownerDid: string, id: string) {
    const record = await this.repository.get(ownerDid, id);
    if (!record) throw new CanvasNotOwnedError(id);
    return record;
  }
}

const publishError = (error: Error) =>
  error instanceof AuthenticationError
    ? error
    : new Error(`Failed to publish canvas: ${error.message}`);
