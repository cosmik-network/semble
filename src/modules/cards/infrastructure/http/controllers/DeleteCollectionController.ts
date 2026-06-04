import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Response } from 'express';
import { DeleteCollectionUseCase } from '../../../application/useCases/commands/DeleteCollectionUseCase';
import { AuthenticatedRequest } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';
import { AuthenticationError } from '../../../../../shared/core/AuthenticationError';

export class DeleteCollectionController extends Controller {
  constructor(private deleteCollectionUseCase: DeleteCollectionUseCase) {
    super();
  }

  async executeImpl(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const { collectionId } = req.body as Record<string, string>;
      const curatorId = req.did;

      if (!curatorId) {
        return this.unauthorized(res);
      }

      if (!collectionId) {
        return this.badRequest(res, 'Collection ID is required');
      }

      const result = await this.deleteCollectionUseCase.execute({
        collectionId,
        curatorId,
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
