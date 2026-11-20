import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Response } from 'express';
import { AuthenticatedRequest } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';
import { GetLibrariesForAnnotationUseCase } from '../../../application/useCases/queries/GetLibrariesForAnnotationUseCase';
import { CardSortField, SortOrder } from '../../../domain/ICardQueryRepository';

export class GetLibrariesForAnnotationController extends Controller {
  constructor(
    private getLibrariesForAnnotationUseCase: GetLibrariesForAnnotationUseCase,
  ) {
    super();
  }

  async executeImpl(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const { url, exact } = req.query;
      const callingUserId = req.did;

      if (!url || typeof url !== 'string') {
        return this.badRequest(res, 'URL query parameter is required');
      }
      if (!exact || typeof exact !== 'string') {
        return this.badRequest(res, 'exact query parameter is required');
      }

      const page = req.query.page
        ? parseInt(req.query.page as string, 10)
        : undefined;
      const limit = req.query.limit
        ? parseInt(req.query.limit as string, 10)
        : undefined;
      const sortBy = req.query.sortBy as CardSortField;
      const sortOrder = req.query.sortOrder as SortOrder;

      const result = await this.getLibrariesForAnnotationUseCase.execute({
        url,
        exact,
        callingUserId,
        page,
        limit,
        sortBy,
        sortOrder,
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
