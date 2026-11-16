import { Response } from 'express';
import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { AuthenticatedRequest } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';
import { CanvasService } from '../../../application/CanvasService';
import { CanvasNotOwnedError } from '../../../application/CanvasService';

// One controller for the whole resource: every route is the same shape
// (authenticate, validate, delegate to CanvasService, map errors), so
// separate controller classes would repeat this wrapper ten times over.
export class CanvasController extends Controller {
  constructor(private canvasService: CanvasService) {
    super();
  }

  // Routes call the per-operation methods directly; this only satisfies
  // the base class
  protected async executeImpl() {}

  async create(req: AuthenticatedRequest, res: Response) {
    const ownerDid = this.owner(res, req);
    if (!ownerDid) return;
    const { id, name } = req.body;
    try {
      const canvas = await this.canvasService.create(ownerDid, id, name);
      return this.ok(res, { canvas });
    } catch (error) {
      return this.mapError(res, error);
    }
  }

  async list(req: AuthenticatedRequest, res: Response) {
    const ownerDid = this.owner(res, req);
    if (!ownerDid) return;
    try {
      const canvases = await this.canvasService.list(
        ownerDid,
        req.query.includeThumbnails === 'true',
      );
      return this.ok(res, { canvases });
    } catch (error) {
      return this.mapError(res, error);
    }
  }

  async get(req: AuthenticatedRequest, res: Response) {
    const ownerDid = this.owner(res, req);
    if (!ownerDid) return;
    try {
      const canvas = await this.canvasService.get(
        ownerDid,
        String(req.query.canvasId),
      );
      return this.ok(res, { canvas });
    } catch (error) {
      return this.mapError(res, error);
    }
  }

  async rename(req: AuthenticatedRequest, res: Response) {
    const ownerDid = this.owner(res, req);
    if (!ownerDid) return;
    const { canvasId, name } = req.body;
    try {
      const canvas = await this.canvasService.rename(ownerDid, canvasId, name);
      return this.ok(res, { canvas });
    } catch (error) {
      return this.mapError(res, error);
    }
  }

  async duplicate(req: AuthenticatedRequest, res: Response) {
    const ownerDid = this.owner(res, req);
    if (!ownerDid) return;
    const { canvasId } = req.body;
    try {
      const canvas = await this.canvasService.duplicate(ownerDid, canvasId);
      return this.ok(res, { canvas });
    } catch (error) {
      return this.mapError(res, error);
    }
  }

  async delete(req: AuthenticatedRequest, res: Response) {
    const ownerDid = this.owner(res, req);
    if (!ownerDid) return;
    const { canvasId } = req.body;
    try {
      await this.canvasService.delete(ownerDid, canvasId);
      return this.ok(res, {});
    } catch (error) {
      return this.mapError(res, error);
    }
  }

  async open(req: AuthenticatedRequest, res: Response) {
    const ownerDid = this.owner(res, req);
    if (!ownerDid) return;
    try {
      const opened = await this.canvasService.open(
        ownerDid,
        String(req.query.canvasId),
      );
      // The service names it record; the contract's wire shape says canvas
      const { record, document } = opened;
      return this.ok(res, { canvas: record, document });
    } catch (error) {
      return this.mapError(res, error);
    }
  }

  async save(req: AuthenticatedRequest, res: Response) {
    const ownerDid = this.owner(res, req);
    if (!ownerDid) return;
    const { canvasId, baseRevision, document, linkCount, tldrawVersion } =
      req.body;
    try {
      const result = await this.canvasService.save(
        ownerDid,
        canvasId,
        baseRevision,
        document,
        linkCount,
        tldrawVersion,
      );
      if (result.conflict) {
        // The board's current revision, so the client can reopen it
        return res.status(409).json({
          error: 'Another writer saved this canvas first',
          currentRevision: result.currentRevision,
        });
      }
      return this.ok(res, {
        revision: result.revision,
        updatedAt: result.updatedAt.toISOString(),
      });
    } catch (error) {
      return this.mapError(res, error);
    }
  }

  async saveThumbnail(req: AuthenticatedRequest, res: Response) {
    const ownerDid = this.owner(res, req);
    if (!ownerDid) return;
    const { canvasId, thumbnail } = req.body;
    try {
      await this.canvasService.saveThumbnail(ownerDid, canvasId, thumbnail);
      return this.ok(res, {});
    } catch (error) {
      return this.mapError(res, error);
    }
  }

  async getThumbnail(req: AuthenticatedRequest, res: Response) {
    const ownerDid = this.owner(res, req);
    if (!ownerDid) return;
    try {
      const thumbnail = await this.canvasService.thumbnail(
        ownerDid,
        String(req.query.canvasId),
      );
      return this.ok(res, { thumbnail });
    } catch (error) {
      return this.mapError(res, error);
    }
  }

  async share(req: AuthenticatedRequest, res: Response) {
    const ownerDid = this.owner(res, req);
    if (!ownerDid) return;
    const { canvasId } = req.body;
    try {
      const shared = await this.canvasService.share(ownerDid, canvasId);
      const { record, shareToken } = shared;
      return this.ok(res, { canvas: record, shareToken });
    } catch (error) {
      return this.mapError(res, error);
    }
  }

  async unshare(req: AuthenticatedRequest, res: Response) {
    const ownerDid = this.owner(res, req);
    if (!ownerDid) return;
    const { canvasId } = req.body;
    try {
      const canvas = await this.canvasService.unshare(ownerDid, canvasId);
      return this.ok(res, { canvas });
    } catch (error) {
      return this.mapError(res, error);
    }
  }

  // Public: the share token is the credential, so no owner
  async openShared(req: AuthenticatedRequest, res: Response) {
    try {
      const opened = await this.canvasService.openShared(
        String(req.query.shareToken),
      );
      const { record, document } = opened;
      return this.ok(res, { canvas: record, document });
    } catch (error) {
      return this.mapError(res, error);
    }
  }

  // Public: the share token is the credential, so no owner
  async sharedThumbnail(req: AuthenticatedRequest, res: Response) {
    try {
      const thumbnail = await this.canvasService.sharedThumbnail(
        String(req.query.shareToken),
      );
      return this.ok(res, { thumbnail });
    } catch (error) {
      return this.mapError(res, error);
    }
  }

  private owner(res: Response, req: AuthenticatedRequest) {
    const ownerDid = req.did;
    if (!ownerDid) {
      this.unauthorized(res);
      return null;
    }
    return ownerDid;
  }

  private mapError(res: Response, error: unknown) {
    if (error instanceof CanvasNotOwnedError) return this.notFound(res);
    if (error instanceof Error && error.message.includes('data URL')) {
      return this.badRequest(res, error.message);
    }
    console.warn('[CanvasController]', error);
    return this.fail(res, error as Error);
  }
}
