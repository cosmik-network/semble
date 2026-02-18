import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Response } from 'express';
import { GetOpenCollectionsWithContributorUseCase } from '../../../application/useCases/queries/GetOpenCollectionsWithContributorUseCase';
import {
  CollectionSortField,
  SortOrder,
} from '../../../domain/ICollectionQueryRepository';
import { AuthenticatedRequest } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';

export class GetOpenCollectionsWithContributorController extends Controller {
  constructor(
    private getOpenCollectionsWithContributorUseCase: GetOpenCollectionsWithContributorUseCase,
  ) {
    super();
  }

  async executeImpl(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const { identifier } = req.params;
      const { page, limit, sortBy, sortOrder } = req.query;
      const callerDid = req.did;

      if (!identifier) {
        return this.fail(res, 'Identifier (DID or handle) is required');
      }

      const result =
        await this.getOpenCollectionsWithContributorUseCase.execute({
          contributorId: identifier,
          callingUserId: callerDid,
          page: page ? parseInt(page as string) : undefined,
          limit: limit ? parseInt(limit as string) : undefined,
          sortBy: sortBy as CollectionSortField,
          sortOrder: sortOrder as SortOrder,
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
