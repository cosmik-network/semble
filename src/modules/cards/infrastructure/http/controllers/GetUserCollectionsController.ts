import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Response } from 'express';
import { GetCollectionsUseCase } from '../../../application/useCases/queries/GetCollectionsUseCase';
import {
  CollectionSortField,
  SortOrder,
} from '../../../domain/ICollectionQueryRepository';
import { AuthenticatedRequest } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';

export class GetUserCollectionsController extends Controller {
  constructor(private getCollectionsUseCase: GetCollectionsUseCase) {
    super();
  }

  async executeImpl(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const { identifier } = req.params;
      const { page, limit, sortBy, sortOrder, searchText } = req.query;
      const callerDid = req.did;

      if (!identifier) {
        return this.fail(res, 'Identifier (DID or handle) is required');
      }

      const result = await this.getCollectionsUseCase.execute({
        curatorId: identifier,
        callingUserId: callerDid,
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
