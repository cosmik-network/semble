import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Response } from 'express';
import {
  UnsubscribeFromTargetUseCase,
  NotFollowingError,
} from '../../../application/useCases/commands/UnsubscribeFromTargetUseCase';
import { AuthenticatedRequest } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';

export class UnsubscribeFromTargetController extends Controller {
  constructor(
    private unsubscribeFromTargetUseCase: UnsubscribeFromTargetUseCase,
  ) {
    super();
  }

  async executeImpl(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const { targetId, targetType } = req.body as Record<string, string>;
      const followerId = req.did;

      if (!followerId) {
        return this.unauthorized(res);
      }

      if (!targetId || !targetType) {
        return this.badRequest(res, 'Target ID and type are required');
      }

      const result = await this.unsubscribeFromTargetUseCase.execute({
        followerId,
        targetId,
        targetType: targetType as 'USER' | 'COLLECTION',
      });

      if (result.isErr()) {
        if (result.error instanceof NotFollowingError) {
          return this.badRequest(res, result.error.message);
        }
        return this.fail(res, result.error);
      }

      return this.ok(res, { success: true });
    } catch (error: any) {
      return this.handleError(res, error);
    }
  }
}
