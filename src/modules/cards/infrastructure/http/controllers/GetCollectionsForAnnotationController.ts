import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Response } from 'express';
import { AuthenticatedRequest } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';
import { GetCollectionsForAnnotationUseCase } from '../../../application/useCases/queries/GetCollectionsForAnnotationUseCase';
import { GetCollectionsForAnnotationResponse } from '@semble/types';
import {
  CollectionSortField,
  SortOrder,
} from '../../../domain/ICollectionQueryRepository';

export class GetCollectionsForAnnotationController extends Controller {
  constructor(
    private getCollectionsForAnnotationUseCase: GetCollectionsForAnnotationUseCase,
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
      const sortBy = req.query.sortBy as CollectionSortField;
      const sortOrder = req.query.sortOrder as SortOrder;

      const result = await this.getCollectionsForAnnotationUseCase.execute({
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

      return this.ok<GetCollectionsForAnnotationResponse>(res, result.value);
    } catch (error: any) {
      return this.fail(res, error);
    }
  }
}
