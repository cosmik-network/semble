import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Response } from 'express';
import { GetSimilarUrlsForUrlUseCase } from '../../../application/useCases/queries/GetSimilarUrlsForUrlUseCase';
import { AuthenticatedRequest } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';

export class GetSimilarUrlsForUrlController extends Controller {
  constructor(
    private getSimilarUrlsForUrlUseCase: GetSimilarUrlsForUrlUseCase,
  ) {
    super();
  }

  async executeImpl(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const { url, page, limit, threshold, urlType } = req.query;

      if (!url || typeof url !== 'string') {
        return this.fail(res, 'URL parameter is required');
      }

      const result = await this.getSimilarUrlsForUrlUseCase.execute({
        url,
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
