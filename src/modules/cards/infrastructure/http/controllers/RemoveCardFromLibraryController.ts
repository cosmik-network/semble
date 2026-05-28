import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Response } from 'express';
import { RemoveCardFromLibraryUseCase } from '../../../application/useCases/commands/RemoveCardFromLibraryUseCase';
import { AuthenticatedRequest } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';
import { AuthenticationError } from '../../../../../shared/core/AuthenticationError';

export class RemoveCardFromLibraryController extends Controller {
  constructor(
    private removeCardFromLibraryUseCase: RemoveCardFromLibraryUseCase,
  ) {
    super();
  }

  async executeImpl(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const { cardId } = req.body as Record<string, string>;
      const curatorId = req.did;

      if (!curatorId) {
        return this.unauthorized(res);
      }

      if (!cardId) {
        return this.badRequest(res, 'Card ID is required');
      }

      const result = await this.removeCardFromLibraryUseCase.execute({
        cardId,
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
