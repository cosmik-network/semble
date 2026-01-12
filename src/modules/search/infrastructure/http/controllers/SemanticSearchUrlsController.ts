import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Response } from 'express';
import { SemanticSearchUrlsUseCase } from '../../../application/useCases/queries/SemanticSearchUrlsUseCase';
import { AuthenticatedRequest } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';

export class SemanticSearchUrlsController extends Controller {
  constructor(private semanticSearchUrlsUseCase: SemanticSearchUrlsUseCase) {
    super();
  }

  async executeImpl(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const { query, page, limit, threshold, urlType } = req.query;

      if (!query || typeof query !== 'string') {
        return this.fail(res, 'Query parameter is required');
      }

      const result = await this.semanticSearchUrlsUseCase.execute({
        query,
        callingUserId: req.did, // Pass through the authenticated user's DID
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        threshold: threshold ? parseFloat(threshold as string) : undefined,
        urlType: urlType as string | undefined,
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
