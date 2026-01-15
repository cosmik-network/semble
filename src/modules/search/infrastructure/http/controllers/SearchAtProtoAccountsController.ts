import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Request, Response } from 'express';
import { SearchAtProtoAccountsUseCase } from '../../../application/use-cases/SearchAtProtoAccountsUseCase';
import { AuthenticatedRequest } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';

export class SearchAtProtoAccountsController extends Controller {
  constructor(
    private searchAtProtoAccountsUseCase: SearchAtProtoAccountsUseCase,
  ) {
    super();
  }

  async executeImpl(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const { term, q, limit, cursor } = req.query;

      // Validate that at least one search parameter is provided
      if (!term && !q) {
        return this.badRequest(
          res,
          'Either "term" or "q" parameter is required',
        );
      }

      const result = await this.searchAtProtoAccountsUseCase.execute({
        term: term as string | undefined,
        q: q as string | undefined,
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
