import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Request, Response } from 'express';
import { GetFollowingCountUseCase } from '../../../application/useCases/queries/GetFollowingCountUseCase';

export class GetFollowingCountController extends Controller {
  constructor(private getFollowingCountUseCase: GetFollowingCountUseCase) {
    super();
  }

  async executeImpl(req: Request, res: Response): Promise<any> {
    try {
      const { identifier } = req.params;

      if (!identifier) {
        return this.fail(res, 'Identifier (DID or handle) is required');
      }

      const result = await this.getFollowingCountUseCase.execute({
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
