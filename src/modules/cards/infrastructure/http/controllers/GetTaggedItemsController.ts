import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Response } from 'express';
import {
  GetTaggedItemsUseCase,
  ValidationError,
} from '../../../application/useCases/queries/GetTaggedItemsUseCase';
import { AuthenticatedRequest } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';
import { TaggedItemType } from '@semble/types';

export class GetTaggedItemsController extends Controller {
  constructor(private getTaggedItemsUseCase: GetTaggedItemsUseCase) {
    super();
  }

  async executeImpl(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const tag = req.query.tag as string | undefined;
      if (!tag) {
        return this.badRequest(res, 'Tag is required');
      }

      const itemType = req.query.itemType as TaggedItemType | undefined;
      const user = req.query.user as string | undefined;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit
        ? parseInt(req.query.limit as string, 10)
        : 20;

      const result = await this.getTaggedItemsUseCase.execute({
        tag,
        itemType,
        user,
        callingUserId: req.did,
        page,
        limit,
      });

      if (result.isErr()) {
        if (result.error instanceof ValidationError) {
          return this.badRequest(res, result.error.message);
        }
        return this.fail(res, result.error);
      }

      return this.ok(res, result.value);
    } catch (error: any) {
      return this.handleError(res, error);
    }
  }
}
