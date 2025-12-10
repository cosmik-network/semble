import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Response } from 'express';
import { UpdateUrlCardAssociationsUseCase } from '../../../application/useCases/commands/UpdateUrlCardAssociationsUseCase';
import { AuthenticatedRequest } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';
import { AuthenticationError } from '../../../../../shared/core/AuthenticationError';

export class UpdateUrlCardAssociationsController extends Controller {
  constructor(
    private updateUrlCardAssociationsUseCase: UpdateUrlCardAssociationsUseCase,
  ) {
    super();
  }

  async executeImpl(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const {
        cardId,
        note,
        addToCollections,
        removeFromCollections,
        viaCardId,
      } = req.body;
      const curatorId = req.did;

      if (!curatorId) {
        return this.unauthorized(res);
      }

      if (!cardId) {
        return this.badRequest(res, 'Card ID is required');
      }

      const result = await this.updateUrlCardAssociationsUseCase.execute({
        cardId,
        curatorId,
        note,
        addToCollections,
        removeFromCollections,
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
