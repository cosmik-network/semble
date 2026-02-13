import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Response } from 'express';
import { FollowTargetUseCase } from '../../../application/useCases/commands/FollowTargetUseCase';
import { AuthenticatedRequest } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';
import { AuthenticationError } from '../../../../../shared/core/AuthenticationError';

export class FollowTargetController extends Controller {
  constructor(private followTargetUseCase: FollowTargetUseCase) {
    super();
  }

  async executeImpl(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const { targetId, targetType } = req.body;
      const followerId = req.did;

      if (!followerId) {
        return this.unauthorized(res);
      }

      if (!targetId || !targetType) {
        return this.badRequest(res, 'Target ID and type are required');
      }

      const result = await this.followTargetUseCase.execute({
        followerId,
        targetId,
        targetType,
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
