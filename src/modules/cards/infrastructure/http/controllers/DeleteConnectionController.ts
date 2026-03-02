import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Response } from 'express';
import { DeleteConnectionUseCase } from '../../../application/useCases/commands/DeleteConnectionUseCase';
import { AuthenticatedRequest } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';
import { AuthenticationError } from '../../../../../shared/core/AuthenticationError';

export class DeleteConnectionController extends Controller {
  constructor(private deleteConnectionUseCase: DeleteConnectionUseCase) {
    super();
  }

  async executeImpl(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const { connectionId } = req.params;
      const curatorId = req.did;

      if (!curatorId) {
        return this.unauthorized(res);
      }

      if (!connectionId) {
        return this.badRequest(res, 'Connection ID is required');
      }

      const result = await this.deleteConnectionUseCase.execute({
        connectionId,
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
