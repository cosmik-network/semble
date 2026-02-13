import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Response } from 'express';
import { UnfollowTargetUseCase } from '../../../application/useCases/commands/UnfollowTargetUseCase';
import { AuthenticatedRequest } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';
import { AuthenticationError } from '../../../../../shared/core/AuthenticationError';

export class UnfollowTargetController extends Controller {
  constructor(private unfollowTargetUseCase: UnfollowTargetUseCase) {
    super();
  }

  async executeImpl(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const { targetId, targetType } = req.params;
      const followerId = req.did;

      if (!followerId) {
        return this.unauthorized(res);
      }

      if (!targetId || !targetType) {
        return this.badRequest(res, 'Target ID and type are required');
      }

      const result = await this.unfollowTargetUseCase.execute({
        followerId,
        targetId,
        targetType: targetType as 'USER' | 'COLLECTION',
      });

      if (result.isErr()) {
        if (result.error instanceof AuthenticationError) {
          return this.unauthorized(res, result.error.message);
        }
        return this.fail(res, result.error);
      }

      return this.ok(res, { success: true });
    } catch (error: any) {
      return this.handleError(res, error);
    }
  }
}
