import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Response } from 'express';
import { GetProfileUseCase } from '../../../application/useCases/queries/GetProfileUseCase';
import { AuthenticatedRequest } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';

export class GetMyProfileController extends Controller {
  constructor(private getProfileUseCase: GetProfileUseCase) {
    super();
  }

  async executeImpl(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const userId = req.did;

      if (!userId) {
        return this.unauthorized(res);
      }

      const result = await this.getProfileUseCase.execute({
        userId,
        callerDid: req.did,
        includeStats:
          req.query.includeStats === 'true' || req.query.includeStats === '1',
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
