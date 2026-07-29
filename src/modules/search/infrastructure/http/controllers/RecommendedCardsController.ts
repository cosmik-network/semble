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
      const { queries } = req.query;

      // A single ?queries=x arrives as a string; repeated params arrive as an array
      const queryList = (Array.isArray(queries) ? queries : [queries]).filter(
        (q): q is string => typeof q === 'string',
      );

      if (queryList.length === 0) {
        return this.fail(res, 'At least one queries parameter is required');
      }

      const result = await this.recommendedCardsUseCase.execute({
        queries: queryList,
        callingUserId: req.did, // Pass through the authenticated user's DID
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
