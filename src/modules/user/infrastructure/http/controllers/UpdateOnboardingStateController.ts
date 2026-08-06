import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Response } from 'express';
import { AuthenticatedRequest } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';
import { UpdateOnboardingStateUseCase } from '../../../application/use-cases/UpdateOnboardingStateUseCase';
import { UpdateOnboardingStateRequest } from '@semble/types';

export class UpdateOnboardingStateController extends Controller {
  constructor(
    private updateOnboardingStateUseCase: UpdateOnboardingStateUseCase,
  ) {
    super();
  }

  async executeImpl(req: AuthenticatedRequest, res: Response): Promise<any> {
    const userId = req.did;
    if (!userId) return this.unauthorized(res, 'User not authenticated');

    // The validated body contains only the fields the client wants to change.
    const update = req.body as UpdateOnboardingStateRequest;
    const result = await this.updateOnboardingStateUseCase.execute({
      userId,
      update,
    });
    if (result.isErr()) {
      return this.fail(res, result.error.message);
    }

    return this.ok(res, result.value);
  }
}
