import { Response } from 'express';
import { z } from 'zod';
import { GetFollowingFeedUseCase } from '../../../application/useCases/queries/GetFollowingFeedUseCase';
import { Controller } from 'src/shared/infrastructure/http/Controller';
import { AuthenticatedRequest } from 'src/shared/infrastructure/http/middleware/AuthMiddleware';
import { GetGlobalFeedResponse, ActivitySource } from '@semble/types';

// Zod schema for request validation
const querySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  beforeActivityId: z.string().optional(),
  urlType: z.string().optional(),
  source: z.nativeEnum(ActivitySource).optional(),
});

export class GetFollowingFeedController extends Controller {
  constructor(private getFollowingFeedUseCase: GetFollowingFeedUseCase) {
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

      // Following feed requires authentication
      if (!callerDid) {
        return this.unauthorized(res, 'Authentication required');
      }

      const result = await this.getFollowingFeedUseCase.execute({
        callingUserId: callerDid,
        page: params.page || 1,
        limit: params.limit || 20,
        beforeActivityId: params.beforeActivityId,
        urlType: params.urlType,
        source: params.source,
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
