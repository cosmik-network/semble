import { BaseClient } from './BaseClient';
import { unwrap } from '../unwrap';
import type {
  CanvasRecord,
  CanvasSummary,
  CanvasDocument,
  CreateCanvasRequest,
  RenameCanvasRequest,
  DuplicateCanvasRequest,
  DeleteCanvasRequest,
  SaveCanvasRequest,
  SaveCanvasResponse,
  SaveThumbnailRequest,
  ShareCanvasRequest,
  UnshareCanvasRequest,
} from '@semble/types';

// Canvas board sync: whole-snapshot saves, one writer at a time. The
// routes are contract-internal, so this client is for the webapp only.
export class CanvasClient extends BaseClient {
  async create(body?: CreateCanvasRequest): Promise<CanvasRecord> {
    const res = await this.client.canvases.create({ body });
    return unwrap<{ canvas: CanvasRecord }>(res).canvas;
  }

  async list(includeThumbnails?: boolean): Promise<CanvasSummary[]> {
    const res = await this.client.canvases.list({
      query: { includeThumbnails },
    });
    return unwrap<{ canvases: CanvasSummary[] }>(res).canvases;
  }

  async get(canvasId: string): Promise<CanvasRecord> {
    const res = await this.client.canvases.get({ query: { canvasId } });
    return unwrap<{ canvas: CanvasRecord }>(res).canvas;
  }

  async rename(body: RenameCanvasRequest): Promise<CanvasRecord> {
    const res = await this.client.canvases.rename({ body });
    return unwrap<{ canvas: CanvasRecord }>(res).canvas;
  }

  async duplicate(body: DuplicateCanvasRequest): Promise<CanvasRecord> {
    const res = await this.client.canvases.duplicate({ body });
    return unwrap<{ canvas: CanvasRecord }>(res).canvas;
  }

  async delete(body: DeleteCanvasRequest): Promise<void> {
    await this.client.canvases.delete({ body });
  }

  async open(
    canvasId: string,
  ): Promise<{ record: CanvasRecord; document: CanvasDocument | null }> {
    const res = await this.client.canvases.open({ query: { canvasId } });
    const opened = unwrap<{
      canvas: CanvasRecord;
      document: CanvasDocument | null;
    }>(res);
    return { record: opened.canvas, document: opened.document };
  }

  // The board's current revision comes back on a conflict, so callers can
  // reload and rebase — returned rather than thrown
  async save(
    body: SaveCanvasRequest,
  ): Promise<SaveCanvasResponse | { conflict: true; currentRevision: number }> {
    const res = await this.client.canvases.save({ body });
    if (res.status === 409) {
      return {
        conflict: true,
        currentRevision: res.body.currentRevision,
      };
    }
    return unwrap<SaveCanvasResponse>(res);
  }

  async saveThumbnail(body: SaveThumbnailRequest): Promise<void> {
    await this.client.canvases.saveThumbnail({ body });
  }

  async getThumbnail(canvasId: string): Promise<string | null> {
    const res = await this.client.canvases.getThumbnail({
      query: { canvasId },
    });
    return unwrap<{ thumbnail: string | null }>(res).thumbnail;
  }

  // Idempotent: a shared board keeps the token it already has
  async share(
    body: ShareCanvasRequest,
  ): Promise<{ record: CanvasRecord; shareToken: string }> {
    const res = await this.client.canvases.share({ body });
    const shared = unwrap<{ canvas: CanvasRecord; shareToken: string }>(res);
    return { record: shared.canvas, shareToken: shared.shareToken };
  }

  async unshare(body: UnshareCanvasRequest): Promise<CanvasRecord> {
    const res = await this.client.canvases.unshare({ body });
    return unwrap<{ canvas: CanvasRecord }>(res).canvas;
  }

  // Public: no session needed, the share token is the credential
  async openShared(
    shareToken: string,
  ): Promise<{ record: CanvasRecord; document: CanvasDocument | null }> {
    const res = await this.client.canvases.openShared({
      query: { shareToken },
    });
    const opened = unwrap<{
      canvas: CanvasRecord;
      document: CanvasDocument | null;
    }>(res);
    return { record: opened.canvas, document: opened.document };
  }
}
