import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Response } from 'express';
import { AddUrlToLibraryUseCase } from '../../../application/useCases/commands/AddUrlToLibraryUseCase';
import { AuthenticatedRequest } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';
import { AuthenticationError } from '../../../../../shared/core/AuthenticationError';

export class AddUrlToLibraryController extends Controller {
  constructor(private addUrlToLibraryUseCase: AddUrlToLibraryUseCase) {
    super();
  }

  async executeImpl(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const { url, note, collectionIds, viaCardId } = req.body;
      const curatorId = req.did;

      if (!curatorId) {
        return this.unauthorized(res);
      }

      if (!url) {
        return this.badRequest(res, 'URL is required');
      }

      const result = await this.addUrlToLibraryUseCase.execute({
        url,
        note,
        collectionIds: collectionIds || [],
        curatorId,
        viaCardId,
      });

      if (result.isErr()) {
        // Check if the error is an authentication error
        if (result.error instanceof AuthenticationError) {
          return this.unauthorized(res, result.error.message);
        }
        return this.fail(res, result.error);
      }

      return this.ok(res, result.value);
    } catch (error: any) {
      return this.handleError(res, error);
    }
  }
}
