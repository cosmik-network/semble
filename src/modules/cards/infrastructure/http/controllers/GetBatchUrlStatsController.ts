import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Response } from 'express';
import { GetBatchUrlStatsUseCase } from '../../../application/useCases/queries/GetBatchUrlStatsUseCase';
import { AuthenticatedRequest } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';
import { GetBatchUrlStatsRequest } from '@semble/types';

export class GetBatchUrlStatsController extends Controller {
  constructor(private getBatchUrlStatsUseCase: GetBatchUrlStatsUseCase) {
    super();
  }

  async executeImpl(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      // Body is validated against the contract by validateBody
      const { urls } = req.body as GetBatchUrlStatsRequest;

      const result = await this.getBatchUrlStatsUseCase.execute({
        urls,
        callingUserId: req.did,
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
