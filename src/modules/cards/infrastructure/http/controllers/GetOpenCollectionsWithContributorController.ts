import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Request, Response } from 'express';
import { GetOpenCollectionsWithContributorUseCase } from '../../../application/useCases/queries/GetOpenCollectionsWithContributorUseCase';
import {
  CollectionSortField,
  SortOrder,
} from '../../../domain/ICollectionQueryRepository';

export class GetOpenCollectionsWithContributorController extends Controller {
  constructor(
    private getOpenCollectionsWithContributorUseCase: GetOpenCollectionsWithContributorUseCase,
  ) {
    super();
  }

  async executeImpl(req: Request, res: Response): Promise<any> {
    try {
      const { identifier } = req.params;
      const { page, limit, sortBy, sortOrder } = req.query;

      if (!identifier) {
        return this.fail(res, 'Identifier (DID or handle) is required');
      }

      const result =
        await this.getOpenCollectionsWithContributorUseCase.execute({
          contributorId: identifier,
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
