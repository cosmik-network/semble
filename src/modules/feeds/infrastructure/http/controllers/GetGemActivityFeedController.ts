import { Response } from 'express';
import { z } from 'zod';
import { GetGemActivityFeedUseCase } from '../../../application/useCases/queries/GetGemActivityFeedUseCase';
import { Controller } from 'src/shared/infrastructure/http/Controller';
import { AuthenticatedRequest } from 'src/shared/infrastructure/http/middleware/AuthMiddleware';
import { GetGlobalFeedResponse } from '@semble/types';

// Zod schema for request validation
const querySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  beforeActivityId: z.string().optional(),
});

export class GetGemActivityFeedController extends Controller {
  constructor(private getGemActivityFeedUseCase: GetGemActivityFeedUseCase) {
    super();
  }

  async executeImpl(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      // Validate request with Zod
      const validation = querySchema.safeParse(req.query);
      if (!validation.success) {
        return this.badRequest(res, JSON.stringify(validation.error.format()));
      }

      const params = validation.data;
      const callerDid = req.did;

      const result = await this.getGemActivityFeedUseCase.execute({
        callingUserId: callerDid,
        page: params.page || 1,
        limit: params.limit || 20,
        beforeActivityId: params.beforeActivityId,
      });

      if (result.isErr()) {
        return this.fail(res, result.error.message);
      }

      return this.ok<GetGlobalFeedResponse>(res, result.value);
    } catch (error) {
      return this.fail(res, 'An unexpected error occurred');
    }
  }
}
