import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Response } from 'express';
import { MarkNotificationsAsReadUseCase } from '../../../application/useCases/commands/MarkNotificationsAsReadUseCase';
import { AuthenticatedRequest } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';

export class MarkNotificationsAsReadController extends Controller {
  constructor(
    private markNotificationsAsReadUseCase: MarkNotificationsAsReadUseCase,
  ) {
    super();
  }

  async executeImpl(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      if (!req.did) {
        return this.unauthorized(res, 'Authentication required');
      }

      const { notificationIds } = req.body;

      if (!notificationIds || !Array.isArray(notificationIds)) {
        return this.fail(res, 'notificationIds array is required');
      }

      const result = await this.markNotificationsAsReadUseCase.execute({
        notificationIds,
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
