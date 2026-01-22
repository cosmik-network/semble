import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Request, Response } from 'express';
import { SearchCollectionsUseCase } from '../../../application/useCases/queries/SearchCollectionsUseCase';
import {
  CollectionSortField,
  SortOrder,
} from '../../../domain/ICollectionQueryRepository';
import { CollectionAccessType } from '../../../domain/Collection';

export class SearchCollectionsController extends Controller {
  constructor(private searchCollectionsUseCase: SearchCollectionsUseCase) {
    super();
  }

  async executeImpl(req: Request, res: Response): Promise<any> {
    try {
      const {
        page,
        limit,
        sortBy,
        sortOrder,
        searchText,
        identifier,
        accessType,
      } = req.query;

      const result = await this.searchCollectionsUseCase.execute({
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        sortBy: sortBy as CollectionSortField,
        sortOrder: sortOrder as SortOrder,
        searchText: searchText as string,
        identifier: identifier as string,
        accessType: accessType as CollectionAccessType,
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
