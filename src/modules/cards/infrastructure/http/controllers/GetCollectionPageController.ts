import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Response } from 'express';
import {
  CollectionNotFoundError,
  GetCollectionPageUseCase,
  ValidationError,
} from '../../../application/useCases/queries/GetCollectionPageUseCase';
import { AuthenticatedRequest } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';
import { CardSortField, SortOrder } from '../../../domain/ICardQueryRepository';

export class GetCollectionPageController extends Controller {
  constructor(private getCollectionPageUseCase: GetCollectionPageUseCase) {
    super();
  }

  async executeImpl(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const { collectionId, page, limit, sortBy, sortOrder, urlType } =
        req.query;
      const callerDid = req.did;

      if (!collectionId) {
        return this.badRequest(res, 'Collection ID is required');
      }

      const result = await this.getCollectionPageUseCase.execute({
        collectionId: collectionId as string,
        callingUserId: callerDid,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        sortBy: sortBy as CardSortField,
        sortOrder: sortOrder as SortOrder,
        urlType: urlType as any,
      });

      if (result.isErr()) {
        const error = result.error;
        if (error instanceof CollectionNotFoundError) {
          return this.notFound(res, error.message, 'COLLECTION_NOT_FOUND');
        }
        if (error instanceof ValidationError) {
          return this.badRequest(res, error.message);
        }
        return this.fail(res, error);
      }

      return this.ok(res, result.value);
    } catch (error: any) {
      return this.fail(res, error);
    }
  }
}
