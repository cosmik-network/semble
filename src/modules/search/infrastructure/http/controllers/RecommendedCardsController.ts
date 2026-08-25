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
      const {
        queries,
        page,
        limit,
        urlCardWeight,
        noteWeight,
        collectionWeight,
        connectionWeight,
        randomness,
        urlType,
      } = req.query;

      // A single ?queries=x arrives as a string; repeated params arrive as an
      // array. When absent, the use case derives queries from the caller's
      // library / profile.
      const queryList = (Array.isArray(queries) ? queries : [queries]).filter(
        (q): q is string => typeof q === 'string',
      );

      // Only include weights the caller actually sent, so the use case falls
      // back to its defaults for the rest.
      const ranking: Record<string, number> = {};
      const weightParams = {
        urlCardWeight,
        noteWeight,
        collectionWeight,
        connectionWeight,
        randomness,
      };
      for (const [key, value] of Object.entries(weightParams)) {
        if (value === undefined) continue;
        const parsed = Number(value);
        if (Number.isFinite(parsed)) {
          ranking[key] = parsed;
        }
      }

      const result = await this.recommendedCardsUseCase.execute({
        queries: queryList,
        callingUserId: req.did, // Pass through the authenticated user's DID
        page: page !== undefined ? Number(page) : undefined,
        limit: limit !== undefined ? Number(limit) : undefined,
        ranking: Object.keys(ranking).length > 0 ? ranking : undefined,
        urlType: typeof urlType === 'string' ? urlType : undefined,
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
