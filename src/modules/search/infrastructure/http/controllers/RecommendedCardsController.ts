import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Response } from 'express';
import { RecommendedCardsUseCase } from '../../../application/useCases/queries/RecommendedCardsUseCase';
import { AuthenticatedRequest } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';

export class RecommendedCardsController extends Controller {
  constructor(private recommendedCardsUseCase: RecommendedCardsUseCase) {
    super();
  }

  async executeImpl(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const { queries, page, limit } = req.query;

      // A single ?queries=x arrives as a string; repeated params arrive as an
      // array. When absent, the use case derives queries from the caller's
      // library / profile.
      const queryList = (Array.isArray(queries) ? queries : [queries]).filter(
        (q): q is string => typeof q === 'string',
      );

      const result = await this.recommendedCardsUseCase.execute({
        queries: queryList,
        callingUserId: req.did, // Pass through the authenticated user's DID
        page: page !== undefined ? Number(page) : undefined,
        limit: limit !== undefined ? Number(limit) : undefined,
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
