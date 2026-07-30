import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Response } from 'express';
import { RecommendedUsersUseCase } from '../../../application/useCases/queries/RecommendedUsersUseCase';
import { AuthenticatedRequest } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';

export class RecommendedUsersController extends Controller {
  constructor(private recommendedUsersUseCase: RecommendedUsersUseCase) {
    super();
  }

  async executeImpl(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const { urls } = req.query;

      // A single ?urls=x arrives as a string; repeated params arrive as an array
      const urlList = (Array.isArray(urls) ? urls : [urls]).filter(
        (u): u is string => typeof u === 'string',
      );

      if (urlList.length === 0) {
        return this.fail(res, 'At least one urls parameter is required');
      }

      if (!req.did) {
        return this.unauthorized(res);
      }

      const result = await this.recommendedUsersUseCase.execute({
        urls: urlList,
        callingUserId: req.did,
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
