import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Response } from 'express';
import { AddAnnotationToLibraryUseCase } from '../../../application/useCases/commands/AddAnnotationToLibraryUseCase';
import { AuthenticatedRequest } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';
import { AuthenticationError } from '../../../../../shared/core/AuthenticationError';

export class AddAnnotationToLibraryController extends Controller {
  constructor(
    private addAnnotationToLibraryUseCase: AddAnnotationToLibraryUseCase,
  ) {
    super();
  }

  async executeImpl(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const { url, selectors, note, collectionIds, viaCardId } = req.body;
      const curatorId = req.did;

      if (!curatorId) {
        return this.unauthorized(res);
      }

      if (!url) {
        return this.badRequest(res, 'URL is required');
      }

      if (!Array.isArray(selectors) || selectors.length === 0) {
        return this.badRequest(res, 'At least one selector is required');
      }

      const result = await this.addAnnotationToLibraryUseCase.execute({
        url,
        selectors,
        note,
        collectionIds: collectionIds || [],
        curatorId,
        viaCardId,
      });

      if (result.isErr()) {
        // Check if the error is an authentication error
        if (result.error instanceof AuthenticationError) {
          return this.handleError(res, result.error);
        }
        return this.fail(res, result.error);
      }

      return this.ok(res, result.value);
    } catch (error: any) {
      return this.handleError(res, error);
    }
  }
}
