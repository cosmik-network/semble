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
      const { identifier } = req.query as Record<string, string>;

      if (!identifier) {
        return this.fail(res, 'Identifier (DID or handle) is required');
      }

      const result = await this.getProfileUseCase.execute({
        userId: identifier,
        callerDid: req.did,
        includeStats:
          req.query.includeStats === 'true' || req.query.includeStats === '1',
      });

      if (result.isErr()) {
        const error = result.error;
        if (error.name === 'ProfileNotFoundError') {
          return this.notFound(res, error.message, 'PROFILE_NOT_FOUND');
        }
        if (error.name === 'ValidationError') {
          return this.badRequest(res, error.message);
        }
        return this.fail(res, error);
      }

      return this.ok(res, result.value);
    } catch (error: any) {
      return this.fail(res, error);
    }
  }
}
