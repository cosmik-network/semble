import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Request, Response } from 'express';
import { GetFollowingCollectionsCountUseCase } from '../../../application/useCases/queries/GetFollowingCollectionsCountUseCase';

export class GetFollowingCollectionsCountController extends Controller {
  constructor(
    private getFollowingCollectionsCountUseCase: GetFollowingCollectionsCountUseCase,
  ) {
    super();
  }

  async executeImpl(req: Request, res: Response): Promise<any> {
    try {
      const { identifier } = req.params;

      if (!identifier) {
        return this.fail(res, 'Identifier (DID or handle) is required');
      }

      const result = await this.getFollowingCollectionsCountUseCase.execute({
        userId: identifier,
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
