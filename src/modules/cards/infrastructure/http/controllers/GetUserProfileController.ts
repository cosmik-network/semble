import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Response } from 'express';
import { AuthenticatedRequest } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';
import { GetProfileUseCase } from '../../../application/useCases/queries/GetProfileUseCase';

export class GetUserProfileController extends Controller {
  constructor(private getProfileUseCase: GetProfileUseCase) {
    super();
  }

  async executeImpl(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const { identifier } = req.params;

      if (!identifier) {
        return this.fail(res, 'Identifier (DID or handle) is required');
      }

      const result = await this.getProfileUseCase.execute({
        userId: identifier,
        callerDid: req.did,
      });

      if (result.isErr()) {
        return this.fail(res, result.error);
      }

      return this.ok(res, result.value);
    } catch (error: any) {
      return this.fail(res, error);
    }
  }
}
