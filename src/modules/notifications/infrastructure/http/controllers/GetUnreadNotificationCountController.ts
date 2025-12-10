import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Response } from 'express';
import { GetUnreadNotificationCountUseCase } from '../../../application/useCases/queries/GetUnreadNotificationCountUseCase';
import { AuthenticatedRequest } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';

export class GetUnreadNotificationCountController extends Controller {
  constructor(private getUnreadNotificationCountUseCase: GetUnreadNotificationCountUseCase) {
    super();
  }

  async executeImpl(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      if (!req.did) {
        return this.unauthorized(res, 'Authentication required');
      }

      const result = await this.getUnreadNotificationCountUseCase.execute({
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
