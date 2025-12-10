import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Response } from 'express';
import { MarkAllNotificationsAsReadUseCase } from '../../../application/useCases/commands/MarkAllNotificationsAsReadUseCase';
import { AuthenticatedRequest } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';

export class MarkAllNotificationsAsReadController extends Controller {
  constructor(
    private markAllNotificationsAsReadUseCase: MarkAllNotificationsAsReadUseCase,
  ) {
    super();
  }

  async executeImpl(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      if (!req.did) {
        return this.unauthorized(res, 'Authentication required');
      }

      const result = await this.markAllNotificationsAsReadUseCase.execute({
        userId: req.did,
      });

      if (result.isErr()) {
        return this.fail(res, result.error);
      }

      return this.ok(res, result.value);
    } catch (error: any) {
      return this.fail(res, error);
    }
  }
}
