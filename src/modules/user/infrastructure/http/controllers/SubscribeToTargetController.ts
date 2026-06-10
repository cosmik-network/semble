import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Response } from 'express';
import {
  SubscribeToTargetUseCase,
  NotFollowingError,
} from '../../../application/useCases/commands/SubscribeToTargetUseCase';
import { AuthenticatedRequest } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';

export class SubscribeToTargetController extends Controller {
  constructor(private subscribeToTargetUseCase: SubscribeToTargetUseCase) {
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

      const result = await this.subscribeToTargetUseCase.execute({
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

      return this.ok(res, result.value);
    } catch (error: any) {
      return this.handleError(res, error);
    }
  }
}
