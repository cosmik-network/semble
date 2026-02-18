import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Response } from 'express';
import { GetCollectionsUseCase } from '../../../application/useCases/queries/GetCollectionsUseCase';
import { AuthenticatedRequest } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';
import {
  CollectionSortField,
  SortOrder,
} from '../../../domain/ICollectionQueryRepository';

export class GetMyCollectionsController extends Controller {
  constructor(private getCollectionsUseCase: GetCollectionsUseCase) {
    super();
  }

  async executeImpl(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const curatorId = req.did;
      const { page, limit, sortBy, sortOrder, searchText } = req.query;

      if (!curatorId) {
        return this.unauthorized(res);
      }

      const result = await this.getCollectionsUseCase.execute({
        curatorId,
        callingUserId: curatorId,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        sortBy: sortBy as CollectionSortField,
        sortOrder: sortOrder as SortOrder,
        searchText: searchText as string,
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
