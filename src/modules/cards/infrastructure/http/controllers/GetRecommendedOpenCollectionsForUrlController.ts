import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Response } from 'express';
import { GetRecommendedOpenCollectionsForUrlUseCase } from '../../../application/useCases/queries/GetRecommendedOpenCollectionsForUrlUseCase';
import { AuthenticatedRequest } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';

export class GetRecommendedOpenCollectionsForUrlController extends Controller {
  constructor(
    private getRecommendedOpenCollectionsForUrlUseCase: GetRecommendedOpenCollectionsForUrlUseCase,
  ) {
    super();
  }

  async executeImpl(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const callingUserId = req.did;
      if (!callingUserId) {
        return this.unauthorized(res);
      }

      const { url, limit } = req.query;
      if (typeof url !== 'string' || url.trim().length === 0) {
        return this.fail(res, 'url parameter is required');
      }

      const result =
        await this.getRecommendedOpenCollectionsForUrlUseCase.execute({
          url,
          callingUserId,
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
