import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Request, Response } from 'express';
import { SearchLeafletDocsForUrlUseCase } from '../../../application/use-cases/SearchLeafletDocsForUrlUseCase';
import { AuthenticatedRequest } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';

export class SearchLeafletDocsForUrlController extends Controller {
  constructor(
    private searchLeafletDocsForUrlUseCase: SearchLeafletDocsForUrlUseCase,
  ) {
    super();
  }

  async executeImpl(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const { url, limit, cursor } = req.query;

      if (!url || typeof url !== 'string') {
        return this.badRequest(res, 'Query parameter "url" is required');
      }

      const result = await this.searchLeafletDocsForUrlUseCase.execute({
        url,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        cursor: cursor as string | undefined,
        userDid: req.did, // This will be undefined if not authenticated
      });

      if (result.isErr()) {
        return this.fail(res, result.error.message);
      }

      return this.ok(res, result.value);
    } catch (error: any) {
      return this.fail(res, error.message || 'Unknown error');
    }
  }
}
