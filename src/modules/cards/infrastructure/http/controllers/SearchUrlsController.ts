import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Response } from 'express';
import { SearchUrlsUseCase } from '../../../application/useCases/queries/SearchUrlsUseCase';
import { AuthenticatedRequest } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';
import { CardSortField, SortOrder } from '../../../domain/ICardQueryRepository';
import { UrlType } from '../../../domain/value-objects/UrlType';

export class SearchUrlsController extends Controller {
  constructor(private searchUrlsUseCase: SearchUrlsUseCase) {
    super();
  }

  async executeImpl(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const { searchQuery } = req.query;
      const callingUserId = req.did;

      if (!searchQuery || typeof searchQuery !== 'string') {
        return this.badRequest(res, 'Search query is required');
      }

      // Parse pagination parameters
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit
        ? parseInt(req.query.limit as string, 10)
        : 20;

      // Parse sorting parameters
      const sortBy =
        (req.query.sortBy as CardSortField) || CardSortField.UPDATED_AT;
      const sortOrder = (req.query.sortOrder as SortOrder) || SortOrder.DESC;

      // Parse urlType filter
      const urlType = req.query.urlType as UrlType | undefined;

      const result = await this.searchUrlsUseCase.execute({
        searchQuery,
        callingUserId,
        page,
        limit,
        sortBy,
        sortOrder,
        urlType,
      });

      if (result.isErr()) {
        return this.fail(res, result.error);
      }

      return this.ok(res, result.value);
    } catch (error: any) {
      return this.handleError(res, error);
    }
  }
}
