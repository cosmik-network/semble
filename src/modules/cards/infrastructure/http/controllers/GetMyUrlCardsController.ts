import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Response } from 'express';
import { GetUrlCardsUseCase } from '../../../application/useCases/queries/GetUrlCardsUseCase';
import { AuthenticatedRequest } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';
import { CardSortField, SortOrder } from '../../../domain/ICardQueryRepository';

export class GetMyUrlCardsController extends Controller {
  constructor(private getUrlCardsUseCase: GetUrlCardsUseCase) {
    super();
  }

  async executeImpl(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const callerDid = req.did;
      const { page, limit, sortBy, sortOrder, urlType } = req.query;

      if (!callerDid) {
        return this.unauthorized(res);
      }

      const result = await this.getUrlCardsUseCase.execute({
        userId: callerDid,
        callingUserId: callerDid,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        sortBy: sortBy as CardSortField,
        sortOrder: sortOrder as SortOrder,
        urlType: urlType as any,
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
