import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Request, Response } from 'express';
import { GetCollectionFollowersUseCase } from '../../../../user/application/useCases/queries/GetCollectionFollowersUseCase';

export class GetCollectionFollowersController extends Controller {
  constructor(
    private getCollectionFollowersUseCase: GetCollectionFollowersUseCase,
  ) {
    super();
  }

  async executeImpl(req: Request, res: Response): Promise<any> {
    try {
      const { collectionId } = req.params;
      const { page, limit } = req.query;
      const callingUserId = (req as any).did;

      if (!collectionId) {
        return this.fail(res, 'Collection ID is required');
      }

      const result = await this.getCollectionFollowersUseCase.execute({
        collectionId,
        callingUserId,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
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
