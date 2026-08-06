import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Response } from 'express';
import { AuthenticatedRequest } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';
import { GetOnboardingStateUseCase } from '../../../application/use-cases/GetOnboardingStateUseCase';

export class GetOnboardingStateController extends Controller {
  constructor(private getOnboardingStateUseCase: GetOnboardingStateUseCase) {
    super();
  }

  async executeImpl(req: AuthenticatedRequest, res: Response): Promise<any> {
    const userId = req.did;
    if (!userId) return this.unauthorized(res, 'User not authenticated');

    const result = await this.getOnboardingStateUseCase.execute({ userId });
    if (result.isErr()) {
      return this.fail(res, result.error.message);
    }

    return this.ok(res, result.value);
  }
}
