import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Response } from 'express';
import {
  UpdateSubscriptionUseCase,
  NotSubscribedError,
  ValidationError,
} from '../../../application/useCases/commands/UpdateSubscriptionUseCase';
import { AuthenticatedRequest } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';
import { SubscriptionScopeEnum } from '../../../domain/value-objects/SubscriptionScope';

export class UpdateSubscriptionController extends Controller {
  constructor(private updateSubscriptionUseCase: UpdateSubscriptionUseCase) {
    super();
  }

  async executeImpl(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const { targetId, targetType, scopes } = req.body as {
        targetId: string;
        targetType: 'USER' | 'COLLECTION';
        scopes: SubscriptionScopeEnum[];
      };
      const followerId = req.did;

      if (!followerId) {
        return this.unauthorized(res);
      }

      if (!targetId || !targetType || !scopes) {
        return this.badRequest(res, 'targetId, targetType and scopes required');
      }

      const result = await this.updateSubscriptionUseCase.execute({
        followerId,
        targetId,
        targetType,
        scopes,
      });

      if (result.isErr()) {
        if (result.error instanceof NotSubscribedError) {
          return this.badRequest(res, result.error.message);
        }
        if (result.error instanceof ValidationError) {
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
