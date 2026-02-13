import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Request, Response } from 'express';
import { GetCollectionFollowersCountUseCase } from '../../../../user/application/useCases/queries/GetCollectionFollowersCountUseCase';

export class GetCollectionFollowersCountController extends Controller {
  constructor(
    private getCollectionFollowersCountUseCase: GetCollectionFollowersCountUseCase,
  ) {
    super();
  }

  async executeImpl(req: Request, res: Response): Promise<any> {
    try {
      const { collectionId } = req.params;

      if (!collectionId) {
        return this.fail(res, 'Collection ID is required');
      }

      const result = await this.getCollectionFollowersCountUseCase.execute({
        collectionId,
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
