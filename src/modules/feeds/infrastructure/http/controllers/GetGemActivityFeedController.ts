import { Request, Response } from 'express';
import { BaseController } from '../../../../../shared/infrastructure/http/BaseController';
import { GetGemActivityFeedUseCase } from '../../../application/useCases/queries/GetGemActivityFeedUseCase';
import { AuthenticatedRequest } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';

export class GetGemActivityFeedController extends BaseController {
  constructor(private getGemActivityFeedUseCase: GetGemActivityFeedUseCase) {
    super();
  }

  async executeImpl(req: Request, res: Response): Promise<void> {
    const authenticatedReq = req as AuthenticatedRequest;
    
    try {
      const { page, limit, beforeActivityId } = req.query;

      const result = await this.getGemActivityFeedUseCase.execute({
        callingUserId: authenticatedReq.did,
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        beforeActivityId: beforeActivityId as string,
      });

      if (result.isErr()) {
        const error = result.error;
        if (error.name === 'ValidationError') {
          return this.badRequest(res, error.message);
        }
        return this.fail(res, error.message);
      }

      return this.ok(res, result.value);
    } catch (error) {
      return this.fail(res, 'An unexpected error occurred');
    }
  }
}
