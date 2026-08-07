import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Response } from 'express';
import { FollowManyUsersUseCase } from '../../../application/useCases/commands/FollowManyUsersUseCase';
import { AuthenticatedRequest } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';
import { AuthenticationError } from '../../../../../shared/core/AuthenticationError';

export class FollowManyUsersController extends Controller {
  constructor(private followManyUsersUseCase: FollowManyUsersUseCase) {
    super();
  }

  async executeImpl(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const { targetIds } = req.body;
      const followerId = req.did;

      if (!followerId) {
        return this.unauthorized(res);
      }

      if (!Array.isArray(targetIds) || targetIds.length === 0) {
        return this.badRequest(res, 'targetIds is required');
      }

      const result = await this.followManyUsersUseCase.execute({
        followerId,
        targetIds,
      });

      if (result.isErr()) {
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
