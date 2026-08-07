import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Response } from 'express';
import { GetBskyFollowedSembleUsersUseCase } from '../../../application/useCases/queries/GetBskyFollowedSembleUsersUseCase';
import { AuthenticatedRequest } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';

export class GetBskyFollowedSembleUsersController extends Controller {
  constructor(
    private getBskyFollowedSembleUsersUseCase: GetBskyFollowedSembleUsersUseCase,
  ) {
    super();
  }

  async executeImpl(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      if (!req.did) {
        return this.unauthorized(res);
      }

      const { page, limit } = req.query;

      const result = await this.getBskyFollowedSembleUsersUseCase.execute({
        callingUserId: req.did,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
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
