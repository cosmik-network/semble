import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Response } from 'express';
import { GetMyNotificationsUseCase } from '../../../application/useCases/queries/GetMyNotificationsUseCase';
import { AuthenticatedRequest } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';

export class GetMyNotificationsController extends Controller {
  constructor(private getMyNotificationsUseCase: GetMyNotificationsUseCase) {
    super();
  }

  async executeImpl(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      if (!req.did) {
        return this.unauthorized(res, 'Authentication required');
      }

      const { page, limit, unreadOnly } = req.query;

      const result = await this.getMyNotificationsUseCase.execute({
        userId: req.did,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        unreadOnly: unreadOnly === 'true',
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
