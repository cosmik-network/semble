import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Response } from 'express';
import { UpdateNoteCardUseCase } from '../../../application/useCases/commands/UpdateNoteCardUseCase';
import { AuthenticatedRequest } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';
import { AuthenticationError } from '../../../../../shared/core/AuthenticationError';

export class UpdateNoteCardController extends Controller {
  constructor(private updateNoteCardUseCase: UpdateNoteCardUseCase) {
    super();
  }

  async executeImpl(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const { cardId, note } = req.body;
      const curatorId = req.did;

      if (!curatorId) {
        return this.unauthorized(res);
      }

      if (!cardId) {
        return this.badRequest(res, 'Card ID is required');
      }

      if (!note) {
        return this.badRequest(res, 'Note text is required');
      }

      const result = await this.updateNoteCardUseCase.execute({
        cardId,
        note,
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
