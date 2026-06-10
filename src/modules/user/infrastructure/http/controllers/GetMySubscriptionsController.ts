import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Response } from 'express';
import { GetMySubscriptionsUseCase } from '../../../application/useCases/queries/GetMySubscriptionsUseCase';
import { AuthenticatedRequest } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';

export class GetMySubscriptionsController extends Controller {
  constructor(private getMySubscriptionsUseCase: GetMySubscriptionsUseCase) {
    super();
  }

  async executeImpl(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const userId = req.did;
      if (!userId) {
        return this.unauthorized(res);
      }

      const { targetType, page, limit } = req.query;

      const result = await this.getMySubscriptionsUseCase.execute({
        userId,
        targetType: targetType as 'USER' | 'COLLECTION' | undefined,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });

      if (result.isErr()) {
        return this.fail(res, result.error);
      }

      return this.ok(res, result.value);
    } catch (error: any) {
      return this.handleError(res, error);
    }
  }
}
