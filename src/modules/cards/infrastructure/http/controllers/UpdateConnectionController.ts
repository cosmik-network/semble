import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Response } from 'express';
import { UpdateConnectionUseCase } from '../../../application/useCases/commands/UpdateConnectionUseCase';
import { AuthenticatedRequest } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';
import { AuthenticationError } from '../../../../../shared/core/AuthenticationError';

export class UpdateConnectionController extends Controller {
  constructor(private updateConnectionUseCase: UpdateConnectionUseCase) {
    super();
  }

  async executeImpl(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const { connectionId } = req.params;
      const { note, removeNote } = req.body;
      const curatorId = req.did;

      if (!curatorId) {
        return this.unauthorized(res);
      }

      if (!connectionId) {
        return this.badRequest(res, 'Connection ID is required');
      }

      if (note === undefined && removeNote === undefined) {
        return this.badRequest(
          res,
          'Either note or removeNote must be provided',
        );
      }

      const result = await this.updateConnectionUseCase.execute({
        connectionId,
        note,
        removeNote,
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
