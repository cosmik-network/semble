import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Response } from 'express';
import { RecommendedCollectionsUseCase } from '../../../application/useCases/queries/RecommendedCollectionsUseCase';
import { AuthenticatedRequest } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';

export class RecommendedCollectionsController extends Controller {
  constructor(
    private recommendedCollectionsUseCase: RecommendedCollectionsUseCase,
  ) {
    super();
  }

  async executeImpl(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const { urls } = req.query;

      // A single ?urls=x arrives as a string; repeated params arrive as an array
      const urlList = (Array.isArray(urls) ? urls : [urls]).filter(
        (u): u is string => typeof u === 'string',
      );

      // Authenticated callers must say which URLs they want recommendations
      // for. Unauthenticated ones may omit them and get seeds drawn from the
      // global feed instead.
      if (req.did && urlList.length === 0) {
        return this.fail(res, 'At least one urls parameter is required');
      }

      const result = await this.recommendedCollectionsUseCase.execute({
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
